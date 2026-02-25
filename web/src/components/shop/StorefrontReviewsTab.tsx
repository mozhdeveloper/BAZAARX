import { motion } from 'framer-motion';
import { Star, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { RefObject } from 'react';

export interface Reply {
    id: number;
    text: string;
    author: string;
    date: string;
    avatar: string;
    isSeller?: boolean;
}

export interface Review {
    id: string;
    author: string;
    avatar: string;
    rating: number;
    date: string;
    content: string;
    helpfulCount: number;
    isLiked?: boolean;
    replies: Reply[];
    productName?: string;
    baseProductName?: string;
    productImage?: string;
    images?: string[];
    variantLabel?: string;
}

interface StorefrontReviewsTabProps {
    reviewStats: {
        total: number;
        avgRating: number;
        distribution: number[];
    };
    seller: any;
    reviews: Review[];
    reviewFilter: string;
    setReviewFilter: (filter: string) => void;
    reviewsStartRef: RefObject<HTMLDivElement>;
    handleToggleLike: (reviewId: string) => void;
    replyingTo: string | null;
    setReplyingTo: (id: string | null) => void;
    replyText: string;
    setReplyText: (text: string) => void;
    handlePostReply: (reviewId: string) => void;
}

export default function StorefrontReviewsTab({
    reviewStats,
    seller,
    reviews,
    reviewFilter,
    setReviewFilter,
    reviewsStartRef,
    handleToggleLike,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    handlePostReply
}: StorefrontReviewsTabProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start"
        >
            {/* Sticky Rating Summary (Left Sidebar) */}
            <div className="md:col-span-5 lg:col-span-4 sticky top-36">
                <div>
                    <div className="text-center mb-2">
                        <div className="text-4xl font-bold text-gray-900 leading-none mb-1">
                            {reviewStats.total > 0 ? reviewStats.avgRating.toFixed(1) : seller.rating}
                        </div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={cn(
                                        "h-3 w-3",
                                        i < Math.floor(reviewStats.total > 0 ? reviewStats.avgRating : seller.rating)
                                            ? "fill-current text-yellow-500"
                                            : "text-gray-300"
                                    )}
                                />
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 font-medium">
                            {reviewStats.total > 0 ? reviewStats.total.toLocaleString() : seller.totalReviews.toLocaleString()} reviews
                        </div>
                    </div>

                    <div className="space-y-1">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = reviewStats.distribution[star - 1] || 0;
                            const percentage = reviewStats.total > 0
                                ? Math.round((count / reviewStats.total) * 100)
                                : (star === 5 ? 70 : star === 4 ? 20 : star === 3 ? 6 : star === 2 ? 3 : 1);
                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <div className="flex items-center justify-end gap-1.5 w-12 shrink-0">
                                        <span className="text-sm font-medium text-gray-700">{star}</span>
                                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                                    </div>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className="h-full bg-yellow-500 rounded-full"
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
                </div>
            </div>

            {/* Reviews List (Right Content) */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
                {/* Anchor for scrolling */}
                <div ref={reviewsStartRef} className="h-0" />

                {/* Review Filters */}
                <div className="sticky top-36 z-20 flex flex-wrap items-center gap-2 mb-4 bg-white p-3 rounded-xl border-0 shadow-md">
                    {['all', '5', '4', '3', '2', '1', 'media'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setReviewFilter(filter)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                                reviewFilter === filter
                                    ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/[0.02]"
                            )}
                        >
                            {filter === 'all' ? 'All' : filter === 'media' ? 'With Media' : `${filter} Star${filter === '1' ? '' : 's'}`}
                        </button>
                    ))}
                </div>

                {/* Filter reviews based on selected filter */}
                {(() => {
                    const filteredReviews = reviews.filter(review => {
                        if (reviewFilter === 'all') return true;
                        if (reviewFilter === 'media') return review.images && review.images.length > 0;
                        return review.rating === parseInt(reviewFilter);
                    });

                    if (filteredReviews.length === 0) {
                        return (
                            <div className="text-center py-12">
                                <div className="text-gray-400 mb-2">
                                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Reviews Yet</h3>
                                <p className="text-gray-500 text-sm">
                                    {reviewFilter === 'all'
                                        ? 'Be the first to review products from this store!'
                                        : `No ${reviewFilter === 'media' ? 'reviews with photos' : `${reviewFilter}-star reviews`} found.`}
                                </p>
                            </div>
                        );
                    }

                    return (
                        <Card className="border-0 shadow-md overflow-hidden bg-white rounded-2xl">
                            {filteredReviews.map((review, idx) => (
                                <div
                                    key={review.id}
                                    className={cn(
                                        "p-6 transition-all duration-200 hover:bg-gray-50/30",
                                        idx !== filteredReviews.length - 1 && "border-b border-[var(--btn-border)]"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={review.avatar}
                                            alt={review.author}
                                            className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                        />
                                        <div className="flex-1">
                                            <div className="mb-2">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 text-sm">{review.author}</span>
                                                    <span className="text-xs text-gray-400 mb-1">{review.date}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={cn(
                                                                "h-3 w-3",
                                                                i < review.rating ? "fill-current text-yellow-500" : "text-gray-200"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Product info if available */}
                                            {review.productName && (
                                                <div className="flex items-center gap-3 mb-3 bg-gray-50 rounded-xl p-3">
                                                    {review.productImage && (
                                                        <img
                                                            src={review.productImage}
                                                            alt={review.productName}
                                                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm"
                                                        />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            Purchased: <span className="font-medium text-[var(--text-headline)]">{review.baseProductName || review.productName || "Product"}</span>
                                                        </span>
                                                        {review.variantLabel && review.variantLabel !== (review.baseProductName || review.productName) && (
                                                            <span className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                                                Variant: {review.variantLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                                                {review.content}
                                            </p>

                                            {/* Review Images if available */}
                                            {review.images && review.images.length > 0 && (
                                                <div className="flex gap-2 mb-3 flex-wrap">
                                                    {review.images.map((img, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={img}
                                                            alt={`Review image ${idx + 1}`}
                                                            className="w-16 h-16 rounded-lg object-cover border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Existing Replies */}
                                            {review.replies.length > 0 && (
                                                <div className="mb-4 pl-4 border-l-2 border-gray-100 space-y-3">
                                                    {review.replies.map(reply => (
                                                        <div key={reply.id} className="bg-gray-50/50 p-3 rounded-lg">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-semibold text-xs text-gray-900">
                                                                    {reply.isSeller ? (seller.name || "Seller") : reply.author}
                                                                </span>
                                                                {reply.isSeller && (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-[var(--brand-primary)]/[0.05] text-[var(--brand-primary)] border-[var(--brand-primary)]/20">
                                                                        Seller
                                                                    </Badge>
                                                                )}
                                                                <span className="text-[10px] text-gray-400">{reply.date}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 leading-relaxed">{reply.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                                <button
                                                    onClick={() => handleToggleLike(review.id)}
                                                    className={cn(
                                                        "transition-colors flex items-center gap-1.5 group",
                                                        review.isLiked ? "text-[var(--brand-primary)]" : "hover:text-[var(--brand-primary)]"
                                                    )}
                                                >
                                                    <ThumbsUp className={cn(
                                                        "h-3.5 w-3.5 transition-colors",
                                                        review.isLiked ? "fill-current text-[var(--brand-primary)]" : "group-hover:text-[var(--brand-primary)]"
                                                    )} />
                                                    ({review.helpfulCount})
                                                </button>
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === review.id ? null : review.id)}
                                                    className="hover:text-[var(--brand-primary)] transition-all"
                                                >
                                                    Reply
                                                </button>
                                            </div>

                                            {replyingTo === review.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <Textarea
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            placeholder="Write a reply..."
                                                            className="min-h-[80px] bg-white border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] mb-3 text-sm resize-none"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => setReplyingTo(null)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handlePostReply(review.id)}
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)] transition-colors"
                                                            >
                                                                Post Reply
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Card>
                    );
                })()}
            </div>
        </motion.div>
    );
}
