import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { getCurrentUser } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ReviewVoteButtonProps {
  reviewId: string;
  helpfulCount: number;
  onVoteChange?: (newCount: number, hasVoted: boolean) => void;
}

export function ReviewVoteButton({
  reviewId,
  helpfulCount,
  onVoteChange,
}: ReviewVoteButtonProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    void checkAuthAndVoteStatus();
  }, [reviewId]);

  const checkAuthAndVoteStatus = async () => {
    const user = await getCurrentUser();

    if (!user) {
      setIsAuthenticated(false);
      setCurrentUserId(null);
      return;
    }

    setIsAuthenticated(true);
    setCurrentUserId(user.id);

    // Check if user has voted
    const voted = await reviewService.hasUserVoted(reviewId, user.id);
    setHasVoted(voted);

    // Check if user is seller (to hide button)
    const canVote = await reviewService.canVoteOnReview(reviewId, user.id);
    setIsSeller(!canVote);
  };

  const handleToggleVote = async () => {
    if (!isAuthenticated || !currentUserId || isLoading || isSeller) {
      return;
    }

    setIsLoading(true);
    try {
      const voted = await reviewService.toggleReviewVote(reviewId, currentUserId);
      setHasVoted(voted);

      // Calculate new count
      const newCount = voted ? helpfulCount + 1 : Math.max(helpfulCount - 1, 0);

      if (onVoteChange) {
        onVoteChange(newCount, voted);
      }
    } catch (error) {
      console.error("Error toggling vote:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <ThumbsUp className="w-3.5 h-3.5" />
        {helpfulCount > 0 && (
          <span className="text-[11px] text-gray-500">
            {helpfulCount} found this helpful
          </span>
        )}
      </div>
    );
  }

  // Don't show interactive vote button for sellers of their own product
  if (isSeller) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <ThumbsUp className="w-3.5 h-3.5" />
        {helpfulCount > 0 && (
          <span className="text-[11px] text-gray-500">
            {helpfulCount} found this helpful
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleVote}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 py-1 text-xs transition-all duration-200",
          hasVoted
            ? "text-[#ff6a00] hover:opacity-80"
            : "text-gray-500 hover:text-gray-700",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <ThumbsUp
          className={cn(
            "w-3.5 h-3.5 transition-all",
            hasVoted && "fill-current"
          )}
        />
        {/* Only show "Helpful?" if count is 0 AND user hasn't voted */}
        {(helpfulCount === 0 && !hasVoted) && <span>Helpful?</span>}
      </button>

      {(helpfulCount > 0 || hasVoted) && (
        <span className="text-[11px] text-gray-500">
          {helpfulCount}
        </span>
      )}
    </div>
  );
}
