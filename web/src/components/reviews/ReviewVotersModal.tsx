import { useEffect, useState } from "react";
import { ThumbsUp, User } from "lucide-react";
import { reviewService } from "@/services/reviewService";
import { getCurrentUser } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ReviewVotersModalProps {
  reviewId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Voter {
  buyerId: string;
  username: string;
  avatarUrl: string;
  votedAt: string;
}

export function ReviewVotersModal({
  reviewId,
  isOpen,
  onClose,
}: ReviewVotersModalProps) {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && reviewId) {
      void fetchVoters();
    }
  }, [isOpen, reviewId]);

  const fetchVoters = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user?.id || null);

      const result = await reviewService.getReviewVoters(reviewId, 20);
      setVoters(result.voters);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("Error fetching voters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const remainingCount = Math.max(totalCount - voters.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-[#ff6a00]" />
            People who found this helpful
          </DialogTitle>
          <DialogDescription>
            {totalCount} {totalCount === 1 ? "person has" : "people have"} found this review helpful
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading voters...
            </div>
          ) : voters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No votes yet
            </div>
          ) : (
            <div className="space-y-3">
              {voters.map((voter) => {
                const isCurrentUser = voter.buyerId === currentUserId;

                return (
                  <div
                    key={voter.buyerId}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      isCurrentUser ? "bg-[#ff6a00]/5" : "hover:bg-gray-50"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {voter.avatarUrl ? (
                          <img
                            src={voter.avatarUrl}
                            alt={voter.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "font-medium truncate",
                          isCurrentUser ? "text-[#ff6a00]" : "text-gray-900"
                        )}
                      >
                        {isCurrentUser ? "You" : voter.username}
                      </span>
                      <p className="text-xs text-gray-500">
                        Voted {formatDate(voter.votedAt)}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Show remaining count if more than 20 */}
              {remainingCount > 0 && (
                <div className="text-center py-3 text-sm text-gray-500 border-t border-gray-100">
                  and {remainingCount} more {remainingCount === 1 ? "person" : "people"}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
