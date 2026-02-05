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
  Clock,
  Loader2
} from 'lucide-react';

const AdminReviewModeration: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const { 
    reviews,
    selectedReview,
    pendingReviews,
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
  const [activeTab, setActiveTab] = useState('flagged');
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
  const rejectedReviews = getFilteredReviews('rejected');
  const allFilteredReviews = getFilteredReviews();
  const filteredPending = getFilteredReviews('pending');
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
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
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
              <img
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
            <img
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
                <img
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
            
            {review.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  onClick={() => approveReview(review.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectReview(review);
                    setShowRejectDialog(true);
                  }}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}

            {review.status === 'flagged' && (
              <Button
                size="sm"
                onClick={() => handleUnflag(review.id)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Unflag & Approve
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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Moderation</h1>
              <p className="text-gray-600 mt-1">Manage and moderate customer reviews</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                      <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pending Review</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingReviews.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Flagged Reviews</p>
                      <p className="text-2xl font-bold text-gray-900">{flaggedReviews.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Flag className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{avgRating} ★</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                      <Star className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search reviews by product, buyer, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="pending">
                Pending ({filteredPending.length})
              </TabsTrigger>
              <TabsTrigger value="flagged">
                Flagged ({filteredFlagged.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedReviews.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedReviews.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({allFilteredReviews.length})
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              </div>
            ) : (
              <>
                <TabsContent value="pending">
                  <div className="space-y-4">
                    {filteredPending.length === 0 ? (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending reviews</h3>
                          <p className="text-gray-600">All reviews have been moderated</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <AnimatePresence>
                        {filteredPending.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="flagged">
                  <div className="space-y-4">
                    {filteredFlagged.length === 0 ? (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <Flag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No flagged reviews</h3>
                          <p className="text-gray-600">No reviews require attention</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <AnimatePresence>
                        {filteredFlagged.map((review) => (
                          <ReviewCard key={review.id} review={review} />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="approved">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {approvedReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </AnimatePresence>
                  </div>
                </TabsContent>

                <TabsContent value="rejected">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {rejectedReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </AnimatePresence>
                  </div>
                </TabsContent>

                <TabsContent value="all">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {allFilteredReviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </AnimatePresence>
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>Full review information</DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div>
                <Label>Product</Label>
                <div className="flex items-center gap-3 mt-2">
                  <img
                    src={selectedReview.productImage}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <p className="font-semibold">{selectedReview.productName}</p>
                    <p className="text-sm text-gray-600">{selectedReview.sellerName}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Buyer</Label>
                <div className="flex items-center gap-3 mt-2">
                  <img
                    src={selectedReview.buyerAvatar}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{selectedReview.buyerName}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(selectedReview.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Rating</Label>
                <div className="mt-2">{renderStars(selectedReview.rating)}</div>
              </div>

              {selectedReview.title && (
                <div>
                  <Label>Title</Label>
                  <p className="mt-2 font-semibold">{selectedReview.title}</p>
                </div>
              )}

              <div>
                <Label>Review Content</Label>
                <p className="mt-2 text-gray-700">{selectedReview.content}</p>
              </div>

              {selectedReview.images && selectedReview.images.length > 0 && (
                <div>
                  <Label>Images</Label>
                  <div className="flex gap-2 mt-2">
                    {selectedReview.images.map((image: string, idx: number) => (
                      <img
                        key={idx}
                        src={image}
                        alt=""
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Helpful Votes</Label>
                  <p className="mt-2">{selectedReview.helpfulCount}</p>
                </div>
                <div>
                  <Label>Reports</Label>
                  <p className="mt-2">{selectedReview.reportCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-2">{getStatusBadge(selectedReview.status)}</div>
                </div>
                <div>
                  <Label>Verified Purchase</Label>
                  <p className="mt-2">{selectedReview.isVerifiedPurchase ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {selectedReview.moderationNote && (
                <div>
                  <Label>Moderation Note</Label>
                  <p className="mt-2 text-sm text-gray-700">{selectedReview.moderationNote}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedReview?.status === 'pending' && (
              <>
                <Button
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowRejectDialog(true);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => {
              setShowDetailsDialog(false);
              selectReview(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this review
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason*</Label>
              <Textarea
                id="reason"
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="Explain why this review is being rejected..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setModerationReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!moderationReason}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Review</DialogTitle>
            <DialogDescription>
              Flag this review for attention
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="flagReason">Flag Reason*</Label>
              <Textarea
                id="flagReason"
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="Explain why this review is being flagged..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFlagDialog(false);
              setModerationReason('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleFlag}
              disabled={!moderationReason}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Flag Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              selectReview(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReviewModeration;
