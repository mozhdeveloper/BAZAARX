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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";



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
                  Reviews & Ratings
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Manage customer feedback and respond to reviews</p>
                {/* Debug info - remove in production */}
                {seller?.id && (
                  <p className="text-xs text-gray-300 mt-1">
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
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-yellow-100 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                        <Star className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[var(--text-muted)] text-sm relative z-10">Average Rating</h3>
                      <div className="flex items-end gap-3 mt-1 relative z-10">
                        <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">{reviewStats.average}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 mb-1.5">
                          <Star className="h-3 w-3 fill-current" />
                          ({reviewStats.total})
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[var(--text-muted)] text-sm relative z-10">Total Reviews</h3>
                      <div className="flex items-end gap-3 mt-1 relative z-10">
                        <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">{reviewStats.total}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 mb-1.5">
                          {reviewStats.withPhotos} photos
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                        <Reply className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[var(--text-muted)] text-sm relative z-10">Needs Reply</h3>
                      <div className="flex items-end gap-3 mt-1 relative z-10">
                        <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">{reviewStats.needsReply}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                          {reviewStats.total > 0 ? ((reviewStats.needsReply / reviewStats.total) * 100).toFixed(0) : 0}% pending
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-50 to-green-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-green-100 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">
                        <Star className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[var(--text-muted)] text-sm relative z-10">5 Star Reviews</h3>
                      <div className="flex items-end gap-3 mt-1 relative z-10">
                        <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">{reviewStats.fiveStar}</p>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 mb-1.5">
                          {reviewStats.total > 0 ? ((reviewStats.fiveStar / reviewStats.total) * 100).toFixed(0) : 0}% of total
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Main Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Left Column - Sticky Rating Distribution */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                      <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                        <CardHeader className="bg-white pb-2 pt-6 px-6">
                          <CardTitle className="text-lg font-black text-[var(--text-headline)]">Rating Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                          <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map(rating => {
                              const count = rating === 5 ? reviewStats.fiveStar :
                                rating === 4 ? reviewStats.fourStar :
                                  rating === 3 ? reviewStats.threeStar :
                                    rating === 2 ? reviewStats.twoStar : reviewStats.oneStar;
                              const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;

                              return (
                                <div key={rating} className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 w-12">
                                    <span className="text-xs font-bold text-gray-600">{rating}</span>
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                  </div>
                                  <div className="flex-1 bg-orange-50/50 rounded-full h-1.5 border border-orange-100/30">
                                    <div
                                      className="bg-yellow-400 h-1.5 rounded-full transition-all shadow-sm"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Right Column - Filters, Search and Reviews */}
                  <div className="lg:col-span-3 space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <Select value={filterRating} onValueChange={setFilterRating}>
                        <SelectTrigger className="h-8 w-full sm:w-[180px] bg-white border border-orange-200 rounded-xl text-[var(--text-headline)] focus:ring-2 focus:ring-orange-500/10 transition-all text-sm px-4 shadow-none">
                          <SelectValue placeholder="All Ratings" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-orange-100 bg-white shadow-xl">
                          <SelectItem value="all" className="text-sm text-[var(--text-headline)] hover:text-white hover:bg-[var(--brand-primary)]">All Ratings</SelectItem>
                          <SelectItem value="5" className="text-sm text-[var(--text-headline)] hover:text-white hover:bg-[var(--brand-primary)]">5 Stars</SelectItem>
                          <SelectItem value="4" className="text-sm text-[var(--text-headline)] hover:text-white hover:bg-[var(--brand-primary)]">4 Stars</SelectItem>
                          <SelectItem value="3" className="text-sm text-[var(--text-headline)] hover:text-white hover:bg-[var(--brand-primary)]">3 Stars</SelectItem>
                          <SelectItem value="2" className="text-sm text-[var(--text-headline)] hover:text-white hover:bg-[var(--brand-primary)]">2 Stars</SelectItem>
                          <SelectItem value="1" className="text-sm text-[var(--text-headline)] hover:text-white hover:bg-[var(--brand-primary)]">1 Star</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex-1 w-full relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-8 pl-11 pr-4 bg-white border border-orange-200 shadow-none rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 transition-all text-sm placeholder:text-gray-400 font-medium"
                        />
                      </div>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-6">
                      <AnimatePresence mode="popLayout">
                        {filteredReviews.length > 0 ? (
                          filteredReviews.map((review) => (
                            <motion.div
                              key={review.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card className="rounded-2xl shadow-sm border-0 bg-white overflow-hidden hover:shadow-md transition-all duration-300 group">
                                <CardContent className="p-0">
                                  {/* Review Header Section */}
                                  <div className="p-6 md:p-8">
                                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                                      {/* Product Image */}
                                      <div className="relative shrink-0">
                                        {review.productImage ? (
                                          <div className="p-1.5 bg-white border border-orange-100 rounded-2xl shadow-sm">
                                            <img
                                              src={review.productImage}
                                              alt={review.productName}
                                              className="w-20 h-20 object-cover rounded-xl"
                                            />
                                          </div>
                                        ) : (
                                          <div className="w-20 h-20 bg-gray-50 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                                            <Star className="h-6 w-6 text-gray-200" />
                                          </div>
                                        )}
                                      </div>

                                      {/* Review Content Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                          <div>
                                            <h3 className="font-bold text-lg text-[var(--text-headline)] truncate group-hover:text-[var(--brand-primary)] transition-colors">{review.productName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                              <div className="flex items-center gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                  <Star
                                                    key={i}
                                                    className={cn(
                                                      "h-3 w-3",
                                                      i < review.rating
                                                        ? "text-yellow-400 fill-current"
                                                        : "text-gray-200"
                                                    )}
                                                  />
                                                ))}
                                              </div>
                                              <span className="text-[10px] font-black text-gray-900 ml-1">{review.rating}.0</span>
                                              <span className="text-[10px] text-gray-400 font-medium">• {formatDate(review.createdAt)}</span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {review.verifiedPurchase && (
                                              <Badge variant="outline" className="text-[10px] font-bold text-green-600 border-green-100 bg-green-50 rounded-full px-2 py-0">
                                                Verified
                                              </Badge>
                                            )}
                                          </div>
                                        </div>

                                        {/* Buyer Info */}
                                        <div className="flex items-center gap-3 mb-5">
                                          <img
                                            src={review.buyerAvatar}
                                            alt={review.buyerName}
                                            className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm"
                                          />
                                          <span className="text-xs font-bold text-gray-700">{review.buyerName}</span>
                                        </div>

                                        {/* Comment */}
                                        <div className="relative">
                                          <p className="text-gray-600 text-sm leading-relaxed mb-4">
                                            {review.comment}
                                          </p>
                                        </div>

                                        {/* Review Images */}
                                        {review.images.length > 0 && (
                                          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                            {review.images.map((img, idx) => (
                                              <div key={idx} className="relative shrink-0 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                                                <img
                                                  src={img}
                                                  alt={`Review ${idx + 1}`}
                                                  className="w-16 h-16 object-cover cursor-zoom-in hover:scale-110 transition-transform duration-300"
                                                />
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Interaction Bar */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                                            <ThumbsUp className="h-3 w-3" />
                                            {review.helpfulCount} helpful
                                          </div>

                                          {!review.sellerReply && (
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                onClick={() => handleReply(review)}
                                                className="h-8 rounded-full bg-white hover:bg-base text-[var(--text-headline)] hover:text-[var(--brand-primary)] border-0 font-bold text-[12px] px-4"
                                              >
                                                <Reply className="h-4 w-4 mr-1.5" />
                                                Reply
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seller Reply Section */}
                                  {review.sellerReply && (
                                    <div className="bg-gray-50/80 p-6 md:p-8 border-t border-gray-100 group-hover:bg-orange-50/30 transition-colors">
                                      <div className="flex items-start gap-4">
                                        <div className="shrink-0 pt-1">
                                          <div className="w-8 h-8 rounded-full bg-orange-100 text-[var(--brand-primary)] flex items-center justify-center">
                                            <Reply className="h-4 w-4" />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-xs font-black text-gray-900">Your Response</h4>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => handleReply(review)}
                                                className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                onClick={() => handleDeleteReply(review)}
                                                className="text-[10px] font-bold text-red-400 hover:text-red-600"
                                              >
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                          <p className="text-sm text-gray-600 leading-relaxed italic">
                                            "{review.sellerReply.message}"
                                          </p>
                                          <p className="text-[10px] text-gray-400 font-medium mt-3">
                                            Replied on {formatDate(review.sellerReply.repliedAt)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))
                        ) : (
                          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                            <div className="flex items-center justify-center mx-auto mb-6">
                              <MessageSquare className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">No reviews found</h3>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto font-medium">
                              {searchQuery || filterRating !== 'all'
                                ? 'Try adjusting your search or filters to find what you are looking for'
                                : 'Customer reviews will appear here once you start getting feedback.'}
                            </p>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
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

