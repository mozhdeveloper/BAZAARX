import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { getCurrentUser } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ReviewVoteButtonProps {
  reviewId: string;
  helpfulCount: number;
  onVoteChange?: (newCount: number, hasVoted: boolean) => void;
  onCountClick?: () => void;
}

export function ReviewVoteButton({
  reviewId,
  helpfulCount,
  onVoteChange,
  onCountClick,
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

  const handleCountClick = () => {
    if (helpfulCount > 0 && onCountClick) {
      onCountClick();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1 text-sm font-medium text-gray-400">
        <ThumbsUp className="w-3.5 h-3.5" />
        <span className="text-xs">{helpfulCount} people found this helpful</span>
      </div>
    );
  }

  // Don't show vote button for sellers
  if (isSeller) {
    return (
      <div className="flex items-center gap-1 text-sm font-medium text-gray-500">
        <ThumbsUp className="w-3.5 h-3.5" />
        <span className="text-xs">{helpfulCount} found helpful</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleVote}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
          hasVoted
            ? "bg-[#ff6a00]/10 text-[#ff6a00] hover:bg-[#ff6a00]/20"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <ThumbsUp
          className={cn(
            "w-3.5 h-3.5 transition-all",
            hasVoted && "fill-current"
          )}
        />
        <span>{hasVoted ? "Helpful" : "Helpful?"}</span>
      </button>

      <button
        onClick={handleCountClick}
        disabled={helpfulCount === 0}
        className={cn(
          "text-xs text-gray-500 transition-colors",
          helpfulCount > 0 && "hover:text-[#ff6a00] cursor-pointer",
          helpfulCount === 0 && "cursor-default"
        )}
      >
        {helpfulCount} found this helpful
      </button>
    </div>
  );
}
