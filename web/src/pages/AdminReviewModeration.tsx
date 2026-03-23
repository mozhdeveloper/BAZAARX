import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminReviews } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Star,
  Search,
  CheckCircle,
  XCircle,
  Flag,
  AlertTriangle,
  Trash2,
  Eye,
  ThumbsUp,
  MessageCircle,
  ShieldCheck,
  Loader2
} from 'lucide-react';

const AdminReviewModeration: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const {
    reviews,
    selectedReview,
    flaggedReviews,
    isLoading,
    loadReviews,
    approveReview,
    rejectReview,
    flagReview,
    unflagReview,
    deleteReview,
    selectReview
  } = useAdminReviews();

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [moderationReason, setModerationReason] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadReviews();
    }
  }, [isAuthenticated, loadReviews]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const getFilteredReviews = (status?: string) => {
    const reviewsToFilter = status ? reviews.filter(review => review.status === status) : reviews;
    return reviewsToFilter.filter(review =>
      review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const approvedReviews = getFilteredReviews('approved');
  const allFilteredReviews = getFilteredReviews();
  const filteredFlagged = getFilteredReviews('flagged');

  const handleApprove = async () => {
    if (!selectedReview) return;
    await approveReview(selectedReview.id);
    setShowDetailsDialog(false);
    selectReview(null);
  };

  const handleReject = async () => {
    if (!selectedReview || !moderationReason) return;
    await rejectReview(selectedReview.id, moderationReason);
    setShowRejectDialog(false);
    setModerationReason('');
    selectReview(null);
  };

  const handleFlag = async () => {
    if (!selectedReview || !moderationReason) return;
    await flagReview(selectedReview.id, moderationReason);
    setShowFlagDialog(false);
    setModerationReason('');
    selectReview(null);
  };

  const handleUnflag = async (reviewId: string) => {
    await unflagReview(reviewId);
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    await deleteReview(selectedReview.id);
    setShowDeleteDialog(false);
    selectReview(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'flagged':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Flagged</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
          />
        ))}
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ReviewCard = ({ review }: { review: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3 flex-1">
              <img loading="lazy" 
                src={review.productImage}
                alt=""
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{review.productName}</h3>
                  {review.isVerifiedPurchase && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{review.sellerName}</p>
              </div>
            </div>
            {getStatusBadge(review.status)}
          </div>

          {/* Buyer Info */}
          <div className="flex items-center gap-3 mb-4">
            <img loading="lazy" 
              src={review.buyerAvatar}
              alt=""
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium text-gray-900">{review.buyerName}</p>
              <p className="text-xs text-gray-500">
                {new Date(review.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Rating & Title */}
          <div className="mb-3">
            {renderStars(review.rating)}
            {review.title && (
              <h4 className="font-semibold text-gray-900 mt-2">{review.title}</h4>
            )}
          </div>

          {/* Content */}
          <p className="text-gray-700 mb-4">{review.content}</p>

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mb-4">
              {review.images.map((image: string, idx: number) => (
                <img loading="lazy" 
                  key={idx}
                  src={image}
                  alt=""
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ))}
            </div>
          )}

          {/* Moderation Note */}
          {review.moderationNote && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">Moderation Note</p>
                  <p className="text-sm text-yellow-700">{review.moderationNote}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              {review.helpfulCount} helpful
            </span>
            {review.reportCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <Flag className="w-4 h-4" />
                {review.reportCount} reports
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectReview(review);
                setShowDetailsDialog(true);
              }}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>

            {review.status === 'flagged' && (
              <Button
                size="sm"
                onClick={() => handleUnflag(review.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Unflag & Restore
              </Button>
            )}

            {review.status === 'approved' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  selectReview(review);
                  setShowFlagDialog(true);
                }}
                className="flex-1"
              >
                <Flag className="w-4 h-4 mr-1" />
                Flag
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectReview(review);
                setShowDeleteDialog(true);
              }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const totalReviews = reviews.length;
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Review Moderation</h1>
                <p className="text-[var(--text-muted)]">Manage and moderate customer reviews</p>
              </div>
            </div>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Total Reviews', value: totalReviews, icon: MessageCircle, color: 'blue' },
                { label: 'Flagged Reviews', value: flaggedReviews.length, icon: Flag, color: 'orange' },
                { label: 'Avg Rating', value: `${avgRating} ★`, icon: Star, color: 'green' }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-none shadow-md hover:shadow-[0_20px_40px_rgba(229,140,26,0.1)] transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[var(--brand-accent-light)] transition-colors"></div>
                    <CardContent className="p-6 relative z-10">
                      <div className="flex flex-col gap-4">
                        <div className="text-gray-500 group-hover:text-[var(--brand-primary)] transition-all">
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                          <p className="text-xl font-bold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors">{stat.value}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Filter row: pill tabs + search */}
            <div className="flex items-center justify-between gap-6 mb-6">
              <div className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full p-0.5">
                <div className="flex items-center gap-0.5">
                  {[
                    { id: 'all', label: 'All', count: allFilteredReviews.length },
                    { id: 'approved', label: 'Live', count: approvedReviews.length },
                    { id: 'flagged', label: 'Flagged', count: filteredFlagged.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-4 h-7 text-xs font-medium transition-all duration-300 rounded-full flex items-center gap-1.5 whitespace-nowrap z-10 ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-[var(--brand-primary)]'
                        }`}
                    >
                      {tab.label}
                      <span className={`text-[10px] font-normal ${activeTab === tab.id ? 'text-white/80' : 'text-[var(--text-muted)]/60'}`}>
                        ({tab.count})
                      </span>
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="reviewTabPill"
                          className="absolute inset-0 bg-[var(--brand-primary)] rounded-full -z-10"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-[320px] group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand-primary)]" />
                <Input
                  placeholder="Search reviews by product, buyer, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-white border-gray-200 rounded-xl shadow-sm focus:border-[var(--brand-primary)] focus:ring-0 placeholder:text-gray-400 text-sm"
                />
              </div>
            </div>

            {/* Tabs Content */}

            {/* Tab content panels */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'all' && (
                  <div className="space-y-4">
                    {allFilteredReviews.length === 0 ? (
                      <Card><CardContent className="p-12 text-center">
                        <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews found</h3>
                        <p className="text-gray-600">Try adjusting your search or filters</p>
                      </CardContent></Card>
                    ) : (
                      <AnimatePresence>{allFilteredReviews.map((review) => <ReviewCard key={review.id} review={review} />)}</AnimatePresence>
                    )}
                  </div>
                )}
                {activeTab === 'approved' && (
                  <div className="space-y-4">
                    {approvedReviews.length === 0 ? (
                      <Card><CardContent className="p-12 text-center">
                        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No live reviews</h3>
                        <p className="text-gray-600">Reviews will appear here once submitted</p>
                      </CardContent></Card>
                    ) : (
                      <AnimatePresence>{approvedReviews.map((review) => <ReviewCard key={review.id} review={review} />)}</AnimatePresence>
                    )}
                  </div>
                )}
                {activeTab === 'flagged' && (
                  <div className="space-y-4">
                    {filteredFlagged.length === 0 ? (
                      <Card><CardContent className="p-12 text-center">
                        <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No flagged reviews</h3>
                        <p className="text-gray-600">No reviews have been hidden</p>
                      </CardContent></Card>
                    ) : (
                      <AnimatePresence>{filteredFlagged.map((review) => <ReviewCard key={review.id} review={review} />)}</AnimatePresence>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Review Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Review Details</DialogTitle>
                  <DialogDescription>
                    Comprehensive information about this customer review.
                  </DialogDescription>
                </DialogHeader>

                {selectedReview && (
                  <div className="space-y-6 py-4">
                    <div className="flex items-start gap-4">
                      <img loading="lazy" 
                        src={selectedReview.productImage}
                        alt=""
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900">{selectedReview.productName}</h4>
                        <p className="text-sm text-gray-600">ID: {selectedReview.id}</p>
                        <div className="mt-2 text-sm">
                          {getStatusBadge(selectedReview.status)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-gray-500">Buyer</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <img loading="lazy" src={selectedReview.buyerAvatar} alt="" className="w-6 h-6 rounded-full" />
                          <span className="text-sm font-medium">{selectedReview.buyerName}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-500">Date Submitted</Label>
                        <p className="text-sm mt-1">
                          {new Date(selectedReview.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-gray-500">Rating & Content</Label>
                      <div className="mt-1">
                        {renderStars(selectedReview.rating)}
                        {selectedReview.title && (
                          <p className="font-semibold mt-2">{selectedReview.title}</p>
                        )}
                        <p className="text-gray-700 mt-1 italic">"{selectedReview.content}"</p>
                      </div>
                    </div>

                    {selectedReview.images && selectedReview.images.length > 0 && (
                      <div>
                        <Label className="text-gray-500">Review Images</Label>
                        <div className="flex gap-2 mt-2">
                          {selectedReview.images.map((img: string, i: number) => (
                            <img loading="lazy" key={i} src={img} alt="" className="w-24 h-24 object-cover rounded-lg border" />
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReview.moderationNote && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <Label className="text-yellow-900">Moderation Note</Label>
                        <p className="text-sm text-yellow-700 mt-1">{selectedReview.moderationNote}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {selectedReview.helpfulCount} helpful votes
                      </span>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                    Close
                  </Button>
                  {selectedReview?.status === 'approved' && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        setShowFlagDialog(true);
                      }}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Flag Review
                    </Button>
                  )}
                  {selectedReview?.status === 'flagged' && (
                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        handleUnflag(selectedReview.id);
                        setShowDetailsDialog(false);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Unflag & Restore
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Flag Review Dialog */}
            <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Flag Review</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to flag this review? It will be hidden from the product page.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for flagging</Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Inappropriate language, spam, incorrect product..."
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!moderationReason || isLoading}
                    onClick={handleFlag}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                    Flag & Hide
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the review
                    and remove all associated data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete Permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReviewModeration;
