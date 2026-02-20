import { useEffect, useState } from "react";
import { MessageCircle, Star, User } from "lucide-react";
import {
  reviewService,
  type ReviewFeedItem,
  type ReviewStats,
} from "@/services/reviewService";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReviewVoteButton } from "./ReviewVoteButton";
import { ReviewVotersModal } from "./ReviewVotersModal";

interface ProductReviewsProps {
  productId: string;
  rating: number;
  reviewCount: number;
  variants?: any[];
  currentVariantId?: string;
}

const EMPTY_REVIEW_STATS: ReviewStats = {
  total: 0,
  averageRating: 0,
  distribution: [0, 0, 0, 0, 0],
  withImages: 0,
};

export function ProductReviews({
  productId,
  rating,
  reviewCount,
  variants = [],
  currentVariantId,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ReviewStats>(EMPTY_REVIEW_STATS);
  const [page, setPage] = useState(1);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState(0); // 0 = All
  const [withPhotoFilter, setWithPhotoFilter] = useState(false);
  const [filteringVariantId, setFilteringVariantId] = useState<string | undefined>(undefined);

  useEffect(() => {
    void fetchReviews();
  }, [productId, page, selectedRatingFilter, withPhotoFilter, filteringVariantId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const result = await reviewService.getProductReviews(
        productId,
        page,
        5,
        selectedRatingFilter > 0 ? selectedRatingFilter : undefined,
        withPhotoFilter,
        filteringVariantId
      );

      if (page === 1) {
        setReviews(result.reviews);
      } else {
        setReviews((prev) => {
          const byId = new Map(prev.map((review) => [review.id, review]));
          result.reviews.forEach((review) => {
            byId.set(review.id, review);
          });
          return Array.from(byId.values());
        });
      }

      setTotal(result.total);
      setStats(result.stats);
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      setReviews([]);
      setTotal(0);
      setStats(EMPTY_REVIEW_STATS);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const handleOpenVotersModal = (reviewId: string) => {
    setSelectedReviewId(reviewId);
    setIsVotersModalOpen(true);
  };

  const handleCloseVotersModal = () => {
    setIsVotersModalOpen(false);
    setSelectedReviewId(null);
  };

  const handleVoteChange = (reviewId: string, newCount: number) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? { ...review, helpfulCount: newCount }
          : review
      )
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return "Recently";
    }

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const effectiveTotal = stats.total || total || reviewCount || reviews.length;
  const effectiveRating = stats.total > 0 ? stats.averageRating : rating;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      <div className="md:col-span-5 lg:col-span-4 sticky top-40 z-40">
        <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 shadow-md">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-[var(--text-headline)] leading-none mb-2">
              {effectiveRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < Math.round(effectiveRating)
                      ? "fill-current text-[var(--brand-primary)]"
                      : "text-[var(--text-muted)]",
                  )}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500 font-medium">
              {effectiveTotal} reviews
            </div>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star - 1] || 0;
              const percentage =
                effectiveTotal > 0
                  ? Math.round((count / effectiveTotal) * 100)
                  : 0;

              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center justify-end gap-1.5 w-12 shrink-0">
                    <span className="text-sm font-medium text-gray-700">{star}</span>
                    <Star className="h-3 w-3 fill-current text-[var(--brand-primary)]" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--brand-primary)] rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--brand-wash-gold)]/30">
            <h4 className="text-sm font-bold text-[var(--text-headline)] mb-4">Filter Reviews</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setPage(1);
                  setSelectedRatingFilter(0);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                  selectedRatingFilter === 0
                    ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm"
                    : "bg-white text-[var(--text-muted)] border-gray-200 hover:border-[var(--brand-wash-gold)]"
                )}
              >
                All
              </button>
              {[5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => {
                    setPage(1);
                    setSelectedRatingFilter(star);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-semibold transition-all border flex items-center gap-1",
                    selectedRatingFilter === star
                      ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm"
                      : "bg-white text-[var(--text-muted)] border-gray-200 hover:border-[var(--brand-wash-gold)]"
                  )}
                >
                  {star} <Star className={cn("w-3 h-3", selectedRatingFilter === star ? "fill-white" : "fill-[var(--brand-primary)]")} />
                </button>
              ))}
              <button
                onClick={() => {
                  setPage(1);
                  setWithPhotoFilter(!withPhotoFilter);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold transition-all border flex items-center gap-1",
                  withPhotoFilter
                    ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm"
                    : "bg-white text-[var(--text-muted)] border-gray-200 hover:border-[var(--brand-wash-gold)]"
                )}
              >
                With Photo
              </button>
            </div>

            {variants.length > 0 && (
              <div className="mt-4">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2">Filter by Variant</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setPage(1);
                      setFilteringVariantId(undefined);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                      !filteringVariantId
                        ? "bg-gray-800 text-white border-gray-800"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    All Variants
                  </button>
                  {variants.map((v) => {
                    const label = [v.size || v.option_1_value, v.color || v.option_2_value].filter(Boolean).join(" / ");
                    if (!label) return null;
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          setPage(1);
                          setFilteringVariantId(v.id);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                          filteringVariantId === v.id
                            ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:col-span-7 lg:col-span-8 space-y-4">
        {loading && page === 1 ? (
          <div className="text-center py-12 text-gray-500">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--brand-wash-gold)]">
            <MessageCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
            <h3 className="text-lg font-medium text-[var(--text-headline)]">No reviews yet</h3>
            <p className="text-[var(--text-muted)]">Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-[var(--bg-secondary)] border border-[var(--brand-wash-gold)]/30 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-500 overflow-hidden">
                      {review.buyerAvatar ? (
                        <img
                          src={review.buyerAvatar}
                          alt={review.buyerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">
                        {review.buyerName || "Anonymous Buyer"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(review.createdAt)}
                        </span>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-3 h-3",
                                i < review.rating
                                  ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]"
                                  : "fill-[var(--bg-secondary)] text-[var(--text-muted)]",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {review.variantLabel && (
                  <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 text-orange-700 text-xs px-3 py-1 mb-3">
                    Purchased variant: {review.variantLabel}
                  </div>
                )}

                <p className="text-gray-600 leading-snug mb-3 text-sm">
                  {review.comment || "No written feedback."}
                </p>

                {review.images.length > 0 && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {review.images.map((imageUrl, index) => (
                      <img
                        key={`${review.id}-${index}`}
                        src={imageUrl}
                        alt={`Review attachment ${index + 1}`}
                        className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                      />
                    ))}
                  </div>
                )}

                {review.sellerReply && (
                  <div className="mb-4 pl-4 border-l-2 border-[#ff6a00] bg-orange-50/50 p-3 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-[#ff6a00]">
                        Seller Response
                      </span>
                      {review.sellerReply.repliedAt && (
                        <span className="text-[10px] text-gray-400">
                          {formatDate(review.sellerReply.repliedAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {review.sellerReply.message}
                    </p>
                  </div>
                )}

                <ReviewVoteButton
                  reviewId={review.id}
                  helpfulCount={review.helpfulCount}
                  onVoteChange={(newCount) => handleVoteChange(review.id, newCount)}
                  onCountClick={() => handleOpenVotersModal(review.id)}
                />
              </div>
            ))}

            {reviews.length < total && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More Reviews"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ReviewVotersModal
        reviewId={selectedReviewId || ""}
        isOpen={isVotersModalOpen}
        onClose={handleCloseVotersModal}
      />
    </div>
  );
}
