import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Star,
  Package,
  ThumbsUp,
  MessageSquare,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Filter,
  ChevronLeft,
  Eye
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useBuyerStore } from '@/stores/buyerStore';

const MAX_COMMENT_LENGTH = 1000;

// Shape returned by fetchMyReviews (DB row + joins)
interface DbReviewRow {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string | null;
  rating: number;
  comment: string | null;
  helpful_count: number;
  seller_reply: { message: string; replied_at?: string | null } | string | null;
  is_hidden: boolean;
  is_edited: boolean;
  created_at: string;
  product?: {
    id: string;
    name: string;
    product_images?: { image_url: string; is_primary: boolean; sort_order: number }[];
  };
  review_images?: { image_url: string; sort_order: number }[];
}

function getProductImage(review: DbReviewRow): string {
  const images = review.product?.product_images || [];
  const primary = images.find(img => img.is_primary);
  const sorted = [...images].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return primary?.image_url || sorted[0]?.image_url || '';
}

export default function BuyerReviewsPage() {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const { fetchMyReviews, updateMyReview, deleteMyReview, myReviews: rawReviews } = useBuyerStore();
  const myReviews = rawReviews as unknown as DbReviewRow[];
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [reviewModal, setReviewModal] = useState<{ mode: 'edit' | 'delete'; review: DbReviewRow } | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyReviews().finally(() => setIsLoading(false));
  }, [fetchMyReviews]);

  // Memoized — only recomputes when myReviews or selectedRating changes
  const filteredReviews = useMemo(
    () => selectedRating ? myReviews.filter(r => r.rating === selectedRating) : myReviews,
    [myReviews, selectedRating]
  );

  const openEdit = useCallback((review: DbReviewRow) => {
    setEditRating(review.rating);
    setEditComment(review.comment || '');
    setSubmitError(null);
    setReviewModal({ mode: 'edit', review });
  }, []);

  const openDelete = useCallback((review: DbReviewRow) => {
    setSubmitError(null);
    setReviewModal({ mode: 'delete', review });
  }, []);

  const closeModal = useCallback(() => setReviewModal(null), []);

  const handleEditSubmit = useCallback(async () => {
    if (!reviewModal) return;
    const trimmed = editComment.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const success = await updateMyReview(
        reviewModal.review.id,
        { rating: editRating, comment: trimmed, is_edited: true }
      );
      if (success) {
        closeModal();
      } else {
        setSubmitError('Failed to save changes. Please try again.');
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [reviewModal, editRating, editComment, updateMyReview, closeModal]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!reviewModal) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const success = await deleteMyReview(reviewModal.review.id);
      if (success) {
        closeModal();
      } else {
        setSubmitError('Failed to delete review. Please try again.');
      }
    } catch {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [reviewModal, deleteMyReview, closeModal]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating
              ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'text-[var(--text-muted)]'
              }`}
          />
        ))}
      </div>
    );
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
            onClick={() => navigate('/shop')}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Back to Shop</span>
          </button>

          <h1 className="text-3xl font-extrabold font-heading text-[var(--text-headline)] tracking-tight mb-2">My Reviews</h1>
          <p className="text-[var(--text-muted)]">Manage and view all your product reviews</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: 'Total Reviews',
              value: myReviews.length,
              icon: <MessageSquare className="h-5 w-5" />,
              delay: 0.1
            },
            {
              title: 'Average Rating',
              value: myReviews.length > 0
                ? (myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length).toFixed(1)
                : '0.0',
              icon: <Star className="h-5 w-5" />,
              fillIcon: true,
              delay: 0.2
            },
            {
              title: 'Helpful Votes',
              value: myReviews.reduce((acc, r) => acc + (r.helpful_count || 0), 0),
              icon: <ThumbsUp className="h-5 w-5" />,
              delay: 0.3
            },
            {
              title: 'With Photos',
              value: myReviews.filter(r => (r.review_images || []).length > 0).length,
              icon: <ImageIcon className="h-5 w-5" />,
              delay: 0.4
            }
          ].map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: metric.delay }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-all">
                  {metric.icon}
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-[var(--text-muted)] text-sm">{metric.title}</h3>
                <div className="flex items-end gap-3 mt-1">
                  <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">
                    {metric.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-4"
        >
          <div className="flex-1 relative min-w-0">
            <div className="overflow-x-auto scrollbar-hide pb-0.5">
              <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-full md:min-w-max">
                <div className="px-4 py-1.5 text-[11px] sm:text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider border-r border-orange-100/50 mr-2 flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  Rating
                </div>
                <button
                  onClick={() => setSelectedRating(null)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-300",
                    selectedRating === null
                      ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                      : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                  )}
                >
                  All
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSelectedRating(rating)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1",
                      selectedRating === rating
                        ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                        : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                    )}
                  >
                    {rating} <Star className={cn("h-3 w-3", selectedRating === rating ? "fill-white" : "fill-current")} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-[var(--text-muted)]">Loading reviews...</p>
              </CardContent>
            </Card>
          ) : filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-[var(--text-muted)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)] text-lg">No reviews found</p>
                <p className="text-[var(--text-muted)] text-sm">Start reviewing products you've purchased!</p>
              </CardContent>
            </Card>
          ) : (
            filteredReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-transparent hover:border-orange-100 group">
                  <div className="p-4 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Product Image */}
                      {(() => {
                        const img = getProductImage(review);
                        return img ? (
                          <img
                            src={img}
                            alt={review.product?.name || 'Product'}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                            <Package className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400" />
                          </div>
                        );
                      })()}

                      {/* Review Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-[var(--text-headline)] mb-1 truncate">
                              {review.product?.name || 'Unknown Product'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {renderStars(review.rating)}
                              <span className="text-sm text-[var(--text-muted)] whitespace-nowrap">
                                {new Date(review.created_at).toLocaleDateString()}
                                {review.is_edited && ' (Edited)'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                <Package className="h-3 w-3 mr-1" />
                                {review.order_id?.slice(0, 8).toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(review)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-white" onClick={() => openDelete(review)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-[var(--text-primary)] mb-3">{review.comment}</p>

                        {/* Review Images */}
                        {(review.review_images || []).length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(review.review_images || []).map((img: { image_url: string }, idx: number) => (
                              <img
                                key={idx}
                                src={img.image_url}
                                alt={`Review ${idx + 1}`}
                                className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                              />
                            ))}
                          </div>
                        )}

                        {/* Seller Reply */}
                        {review.seller_reply && (
                          <div className="bg-[var(--brand-wash)] rounded-lg p-4 mt-3 border-l-4 border-[var(--brand-primary)]">
                            <p className="text-sm font-medium text-[var(--text-headline)] mb-1">Seller's Response:</p>
                            <p className="text-sm text-[var(--text-primary)]">
                              {typeof review.seller_reply === 'object' ? review.seller_reply.message : review.seller_reply}
                            </p>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[var(--brand-wash-gold)]/20">
                          <button className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--brand-primary)]">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{review.helpful_count || 0} found this helpful</span>
                          </button>
                          <Badge
                            className={
                              !review.is_hidden
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }
                          >
                            {!review.is_hidden ? 'Published' : 'Hidden'}
                          </Badge>
                          {review.is_hidden && (
                            <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1">
                              <Eye className="w-4 h-4 text-gray-500" />
                              Anonymous
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <BazaarFooter />

      {/* Review Edit / Delete Modal */}
      <AnimatePresence>
        {reviewModal && (
          <>
            {/* Backdrop + centering container */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
              onClick={closeModal}
            >
              {/* Sheet — bottom sheet on mobile, centered dialog on sm+ */}
              <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Drag Knob */}
                <div className="flex flex-col items-center pt-3 pb-4 sticky top-0 bg-white z-10">
                  <div className="w-10 h-1.5 bg-gray-300 rounded-full mb-3" />
                  <h2 className="text-lg font-extrabold text-[var(--text-headline)]">
                    {reviewModal.mode === 'edit' ? 'Edit Review' : 'Delete Review'}
                  </h2>
                </div>

                <div className="px-6 pb-10">
                  {/* Review Preview Card */}
                  <div className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm mb-6 border border-orange-50">
                    {getProductImage(reviewModal.review) ? (
                      <img
                        src={getProductImage(reviewModal.review)}
                        alt={reviewModal.review.product?.name || 'Product'}
                        className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center">
                        <Package className="h-7 w-7 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text-headline)] text-sm truncate">
                        {reviewModal.review.product?.name || 'Unknown Product'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {new Date(reviewModal.review.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= reviewModal.review.rating ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {reviewModal.mode === 'edit' ? (
                    <>
                      {/* Rating Input */}
                      <div className="mb-5">
                        <label className="block text-sm font-bold text-[var(--text-headline)] mb-2">Rating</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button
                              key={s}
                              onClick={() => setEditRating(s)}
                              className="transition-transform hover:scale-110 active:scale-95"
                            >
                              <Star className={`h-8 w-8 transition-colors ${s <= editRating ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]' : 'text-gray-300 hover:text-[var(--brand-primary)]'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment Input */}
                      <div className="mb-6">
                        <label className="block text-sm font-bold text-[var(--text-headline)] mb-2">Comment</label>
                        <textarea
                          value={editComment}
                          onChange={e => setEditComment(e.target.value)}
                          rows={4}
                          maxLength={MAX_COMMENT_LENGTH}
                          placeholder="Share your experience..."
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] resize-none bg-white"
                        />
                        <p className="text-xs text-[var(--text-muted)] text-right mt-1">
                          {editComment.length}/{MAX_COMMENT_LENGTH}
                        </p>
                      </div>

                      {submitError && (
                        <p className="text-sm text-red-500 mb-4">{submitError}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 justify-end">
                        <Button
                          onClick={closeModal}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleEditSubmit}
                          disabled={isSubmitting || !editComment.trim()}
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Delete confirmation */}
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
                        <p className="text-sm font-bold text-red-700 mb-1">Are you sure?</p>
                        <p className="text-sm text-red-500 leading-relaxed">
                          This will permanently delete your review. This action cannot be undone.
                        </p>
                        {reviewModal.review.comment && (
                          <p className="mt-3 text-sm text-gray-500 italic border-t border-red-100 pt-3 line-clamp-3">
                            "{reviewModal.review.comment}"
                          </p>
                        )}
                      </div>

                      {submitError && (
                        <p className="text-sm text-red-500 mb-4">{submitError}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 justify-end">
                        <Button
                          onClick={closeModal}
                          variant='outline'
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleDeleteConfirm}
                          disabled={isSubmitting}
                          variant='destructive'
                        >
                          {isSubmitting ? 'Deleting...' : 'Delete Review'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div >
  );
}
