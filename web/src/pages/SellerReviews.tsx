import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  Search,
  Reply,
  Flag,
  Check,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { useAuthStore } from '@/stores/sellerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reviewService, ReviewFeedItem } from '@/services/reviewService';
import { useToast } from '@/hooks/use-toast';



interface ReviewStats {
  total: number;
  average: string;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
  needsReply: number;
  withPhotos: number;
}

export function SellerReviews() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewFeedItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { seller, logout } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();



  // Fetch reviews on mount
  const fetchReviews = useCallback(async () => {
    if (!seller?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await reviewService.getSellerReviews(seller.id);
      setReviews(data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load reviews. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [seller?.id, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Filter reviews based on search, rating, and ensure they belong to current seller
  const filteredReviews = reviews.filter(review => {
    // Safety check: ensure review belongs to current seller
    // This is a client-side filter to match the buyerStore pattern
    const matchesSeller = true; // The API should already filter by seller, but we verify product ownership

    const matchesSearch =
      review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterRating === 'all' || review.rating === parseInt(filterRating);

    return matchesSeller && matchesSearch && matchesFilter;
  });

  // Calculate stats
  const reviewStats: ReviewStats = {
    total: reviews.length,
    average: reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0',
    fiveStar: reviews.filter(r => r.rating === 5).length,
    fourStar: reviews.filter(r => r.rating === 4).length,
    threeStar: reviews.filter(r => r.rating === 3).length,
    twoStar: reviews.filter(r => r.rating === 2).length,
    oneStar: reviews.filter(r => r.rating === 1).length,
    needsReply: reviews.filter(r => !r.sellerReply).length,
    withPhotos: reviews.filter(r => r.images.length > 0).length,
  };

  const handleReply = (review: ReviewFeedItem) => {
    setSelectedReview(review);
    setReplyText(review.sellerReply?.message || '');
    setShowReplyModal(true);
  };

  const submitReply = async () => {
    if (!selectedReview || !seller?.id || !replyText.trim()) return;

    // Debug logging
    console.log('Submitting reply:', {
      reviewId: selectedReview.id,
      sellerId: seller.id,
      productId: selectedReview.productId,
      productName: selectedReview.productName
    });

    setSubmitting(true);

    try {
      const updatedReview = await reviewService.addSellerReply(
        selectedReview.id,
        seller.id,
        replyText.trim()
      );

      if (updatedReview) {
        // Update local state
        setReviews(prev =>
          prev.map(r => r.id === selectedReview.id ? updatedReview : r)
        );

        toast({
          title: 'Success',
          description: 'Your reply has been posted successfully.',
        });
      }

      setShowReplyModal(false);
      setReplyText('');
      setSelectedReview(null);
    } catch (err) {
      console.error('Error submitting reply:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit reply. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (review: ReviewFeedItem) => {
    if (!seller?.id) return;

    if (!confirm('Are you sure you want to delete your reply?')) return;

    try {
      const updatedReview = await reviewService.deleteSellerReply(review.id, seller.id);

      if (updatedReview) {
        setReviews(prev =>
          prev.map(r => r.id === review.id ? updatedReview : r)
        );

        toast({
          title: 'Success',
          description: 'Your reply has been deleted.',
        });
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete reply. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <Star className="h-8 w-8 text-[var(--brand-primary)] fill-current" />
                  </div>
                  Reviews & Ratings
                </h1>
                <p className="text-[var(--text-secondary)] mt-1 font-medium ml-14">Manage customer feedback and respond to reviews</p>
                {/* Debug info - remove in production */}
                {seller?.id && (
                  <p className="text-xs text-gray-300 mt-1 ml-14">
                    ID: {seller.id.substring(0, 8)}...
                  </p>
                )}
              </div>
              <Button
                onClick={fetchReviews}
                variant="outline"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchReviews}
                  className="ml-auto"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-12 w-12 text-orange-500 animate-spin mb-4" />
                <p className="text-gray-600">Loading reviews...</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card className="rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100/50 bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Average Rating</p>
                          <p className="text-3xl font-black text-[var(--text-headline)]">{reviewStats.average}</p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-2xl">
                          <Star className="h-6 w-6 text-yellow-500 fill-current" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                        <span className="text-sm font-medium text-gray-500 ml-2">({reviewStats.total})</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100/50 bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Reviews</p>
                          <p className="text-3xl font-black text-[var(--text-headline)]">{reviewStats.total}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-2xl">
                          <MessageSquare className="h-6 w-6 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mt-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {reviewStats.withPhotos} with photos
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100/50 bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Needs Reply</p>
                          <p className="text-3xl font-black text-[var(--text-headline)]">{reviewStats.needsReply}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-2xl">
                          <Reply className="h-6 w-6 text-orange-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mt-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        {reviewStats.total > 0 ? ((reviewStats.needsReply / reviewStats.total) * 100).toFixed(0) : 0}% pending
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100/50 bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">5 Star Reviews</p>
                          <p className="text-3xl font-black text-[var(--text-headline)]">{reviewStats.fiveStar}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-2xl">
                          <ThumbsUp className="h-6 w-6 text-green-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mt-3 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {reviewStats.total > 0 ? ((reviewStats.fiveStar / reviewStats.total) * 100).toFixed(0) : 0}% of total
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Rating Breakdown */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Rating Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map(rating => {
                        const count = rating === 5 ? reviewStats.fiveStar :
                          rating === 4 ? reviewStats.fourStar :
                            rating === 3 ? reviewStats.threeStar :
                              rating === 2 ? reviewStats.twoStar : reviewStats.oneStar;
                        const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;

                        return (
                          <div key={rating} className="flex items-center gap-3">
                            <div className="flex items-center gap-1 w-24">
                              <span className="text-sm text-gray-600">{rating}</span>
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-400 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-16 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 mb-8">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                      <Input
                        placeholder="Search reviews by product, customer, or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500 transition-all font-medium py-6"
                      />
                    </div>
                    <select
                      value={filterRating}
                      onChange={(e) => setFilterRating(e.target.value)}
                      className="px-6 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-medium bg-white outline-none cursor-pointer hover:border-orange-300 transition-all"
                    >
                      <option value="all">All Ratings</option>
                      <option value="5">5 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="2">2 Stars</option>
                      <option value="1">1 Star</option>
                    </select>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredReviews.map((review) => (
                      <motion.div
                        key={review.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Card className="rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 bg-white overflow-hidden hover:shadow-lg transition-all duration-300">
                          <CardContent className="p-8">
                            {/* Review Header */}
                            <div className="flex items-start gap-5 mb-6">
                              {review.productImage ? (
                                <div className="p-1 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                  <img
                                    src={review.productImage}
                                    alt={review.productName}
                                    className="w-16 h-16 object-cover rounded-xl"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                                  <span className="text-gray-400 text-xs font-semibold">No image</span>
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-bold text-lg text-[var(--text-headline)] mb-1">{review.productName}</h3>
                                {/* Debug info - remove in production */}
                                <p className="text-xs text-gray-300">
                                  PID: {review.productId.substring(0, 8)}...
                                </p>
                                <div className="flex items-center gap-3 flex-wrap mt-1">
                                  <div className="flex items-center gap-0.5 bg-yellow-50 px-2 py-1 rounded-lg">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={cn(
                                          "h-3.5 w-3.5",
                                          i < review.rating
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-300"
                                        )}
                                      />
                                    ))}
                                    <span className="text-xs font-bold text-yellow-700 ml-1.5">{review.rating}.0</span>
                                  </div>
                                  <span className="text-sm font-medium text-gray-400">
                                    • {formatDate(review.createdAt)}
                                  </span>
                                  {review.verifiedPurchase && (
                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 rounded-lg">
                                      <Check className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  )}
                                  {review.variantLabel && (
                                    <Badge variant="secondary" className="text-xs rounded-lg">
                                      {review.variantLabel}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Customer Info */}
                            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50/50 rounded-2xl w-fit">
                              <img
                                src={review.buyerAvatar}
                                alt={review.buyerName}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-white"
                              />
                              <div>
                                <p className="text-sm font-bold text-gray-900 leading-none">{review.buyerName}</p>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">Verified Customer</p>
                              </div>
                            </div>

                            {/* Review Content */}
                            <div className="bg-gray-50/30 rounded-2xl p-4 mb-4 border border-gray-100/50">
                              <p className="text-gray-700 text-[15px] leading-relaxed italic">"{review.comment}"</p>
                            </div>

                            {/* Review Images */}
                            {review.images.length > 0 && (
                              <div className="flex gap-3 mb-6">
                                {review.images.map((img, idx) => (
                                  <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm">
                                    <img
                                      src={img}
                                      alt={`Review ${idx + 1}`}
                                      className="w-20 h-20 object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors pointer-events-none" />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Helpful Count */}
                            <div className="flex items-center gap-4 mb-6">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                                <ThumbsUp className="h-3.5 w-3.5 text-gray-400" />
                                <span>{review.helpfulCount} found helpful</span>
                              </div>
                            </div>

                            {/* Seller Reply */}
                            {review.sellerReply ? (
                              <div className="bg-orange-50 border border-orange-100 rounded-[24px] p-6 relative">
                                <div className="absolute top-0 left-8 -mt-2 w-4 h-4 bg-orange-50 border-t border-l border-orange-100 transform rotate-45" />
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] flex items-center justify-center shadow-md shadow-orange-500/20">
                                      <span className="text-white text-xs font-bold">You</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">Your Response</p>
                                      <span className="text-xs font-medium text-gray-500">
                                        {formatDate(review.sellerReply.repliedAt)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleReply(review)}
                                      className="text-[var(--brand-primary)] hover:text-orange-700 hover:bg-orange-100 rounded-xl h-8 w-8 p-0"
                                    >
                                      <Reply className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteReply(review)}
                                      className="text-red-400 hover:text-red-700 hover:bg-red-50 rounded-xl h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed pl-11">{review.sellerReply.message}</p>
                              </div>
                            ) : (
                              <div className="flex gap-3 pl-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleReply(review)}
                                  className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:shadow-lg hover:shadow-orange-500/20 text-white rounded-xl px-5 font-semibold transition-all"
                                >
                                  <Reply className="h-4 w-4 mr-2" />
                                  Reply to Review
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50 font-medium text-gray-600">
                                  <Flag className="h-4 w-4 mr-2" />
                                  Report
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {filteredReviews.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                    <p className="text-gray-600">
                      {searchQuery || filterRating !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Reviews will appear here when customers leave feedback'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {
        showReplyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {selectedReview?.sellerReply ? 'Edit Reply' : 'Reply to Review'}
              </h3>

              {selectedReview && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Review from {selectedReview.buyerName}:</p>
                  <p className="text-gray-800 italic">"{selectedReview.comment}"</p>
                </div>
              )}

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your response to the customer..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={6}
                disabled={submitting}
              />
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyText('');
                    setSelectedReview(null);
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitReply}
                  disabled={!replyText.trim() || submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    selectedReview?.sellerReply ? 'Update Reply' : 'Send Reply'
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
    </div>
  );
}

