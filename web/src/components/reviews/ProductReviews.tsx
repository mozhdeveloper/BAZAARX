import { useState, useEffect } from "react";
import { Star, ThumbsUp, MessageCircle, Flag, MoreHorizontal, User, Filter } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Assuming exists
import { cn } from "@/lib/utils"; // Assuming exists


interface Review {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    helpful_count: number;
    buyer_id: string;
    seller_reply: Record<string, any> | null; // Changed to match DB
    // seller_reply_at removed
    buyer?: {
        full_name: string | null;
        avatar_url: string | null;
    };
}



interface ProductReviewsProps {
    productId: string;
    rating: number;
    reviewCount: number;
}

export function ProductReviews({ productId, rating, reviewCount }: ProductReviewsProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState("all");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");



    useEffect(() => {
        fetchReviews();
    }, [productId, page]); // Re-fetch when page changes

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const result = await reviewService.getProductReviews(productId, page, 5); // 5 per page
            if (page === 1) {
                setReviews(result.reviews);
            } else {
                setReviews(prev => [...prev, ...result.reviews]);
            }
            setTotal(result.total);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Sticky Rating Summary (Left Sidebar) */}
            <div className="md:col-span-5 lg:col-span-4 sticky top-40 z-40">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-gray-900 leading-none mb-2">
                            {rating.toFixed(1)}
                        </div>
                        <div className="flex items-center justify-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                                <Star
                                    key={i}
                                    className={cn(
                                        "h-4 w-4",
                                        i < Math.round(rating)
                                            ? "fill-current text-yellow-400"
                                            : "text-gray-300"
                                    )}
                                />
                            ))}
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                            {reviewCount} reviews
                        </div>
                    </div>

                    {/* Histogram Placeholder - Real data would require an aggregation query */}
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((star) => (
                            <div key={star} className="flex items-center gap-3">
                                <div className="flex items-center justify-end gap-1.5 w-12 shrink-0">
                                    <span className="text-sm font-medium text-gray-700">{star}</span>
                                    <Star className="h-3 w-3 fill-current text-yellow-400" />
                                </div>
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full"
                                        style={{ width: '0%' }} // TODO: Implement real histogram data
                                    />
                                </div>
                                <span className="text-xs text-gray-400 w-8 text-right tabular-nums">0%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reviews List & Filters (Right Content) */}
            <div className="md:col-span-7 lg:col-span-8 space-y-4">
                {/* Filters */}
                <div className="sticky top-40 z-40 flex flex-wrap items-center gap-2 mb-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                    {["all"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border",
                                filter === f
                                    ? "bg-orange-50 text-orange-600 border-orange-200"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            All Reviews
                        </button>
                    ))}
                </div>

                {loading && page === 1 ? (
                    <div className="text-center py-12 text-gray-500">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No reviews yet</h3>
                        <p className="text-gray-500">Be the first to review this product!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-500 overflow-hidden">
                                            {review.buyer?.avatar_url ? (
                                                <img src={review.buyer.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">
                                                {review.buyer?.full_name || "Anonymous Buyer"}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(review.created_at)}
                                                </span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={cn(
                                                                "w-3 h-3",
                                                                i < review.rating
                                                                    ? "fill-yellow-400 text-yellow-400"
                                                                    : "fill-gray-200 text-gray-200"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-gray-600 leading-snug mb-3 text-sm">
                                    {review.comment}
                                </p>

                                {/* Seller Reply */}
                                {review.seller_reply && (
                                    <div className="mb-4 pl-4 border-l-2 border-[#ff6a00] bg-orange-50/50 p-3 rounded-r-lg">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-xs text-[#ff6a00]">
                                                Seller Response
                                            </span>
                                            {/* Handle nested date if it exists in JSONB, gracefully fallback */}
                                            {review.seller_reply.replied_at && (
                                                <span className="text-[10px] text-gray-400">
                                                    {formatDate(review.seller_reply.replied_at)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-700 leading-relaxed">
                                            {/* Handle both string (legacy) and object (JSONB) formats safely */}
                                            {typeof review.seller_reply === 'string'
                                                ? review.seller_reply
                                                : (review.seller_reply.reply || review.seller_reply.comment || "No content")}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        <span className="text-xs">{review.helpful_count} found helpful</span>
                                    </div>
                                </div>
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
        </div>
    );
}
