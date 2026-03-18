/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { Review } from './adminTypes';
// Review Moderation Store
interface ReviewsState {
  reviews: Review[];
  selectedReview: Review | null;
  pendingReviews: Review[];
  flaggedReviews: Review[];
  isLoading: boolean;
  error: string | null;
  loadReviews: () => Promise<void>;
  approveReview: (id: string) => Promise<void>;
  rejectReview: (id: string, reason: string) => Promise<void>;
  flagReview: (id: string, reason: string) => Promise<void>;
  unflagReview: (id: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  selectReview: (review: Review | null) => void;
  clearError: () => void;
}

export const useAdminReviews = create<ReviewsState>((set) => ({
  reviews: [],
  selectedReview: null,
  pendingReviews: [],
  flaggedReviews: [],
  isLoading: false,
  error: null,

  loadReviews: async () => {
    set({ isLoading: true, error: null });
 
    try {
      const { reviewService } = await import('@/services/reviewService');
      const data = await reviewService.getAdminReviews(500);
 
      const reviews: Review[] = data.map((row) => {
        // Map service's isHidden to store's status
        // Live by default (approved), hidden => flagged
        const status: 'pending' | 'approved' | 'rejected' | 'flagged' = row.isHidden ? 'flagged' : 'approved';
 
        return {
          id: row.id,
          productId: row.productId,
          productName: row.productName || 'Unknown Product',
          productImage: row.productImage || '',
          buyerId: row.buyerId,
          buyerName: row.buyerName || 'Unknown',
          buyerAvatar: row.buyerAvatar,
          sellerId: '', 
          sellerName: '', 
          rating: row.rating,
          title: '',
          content: row.comment || '',
          images: row.images || [],
          isVerifiedPurchase: row.verifiedPurchase || false,
          status,
          moderationNote: undefined,
          helpfulCount: row.helpfulCount || 0,
          reportCount: 0,
          createdAt: new Date(row.createdAt)
        };
      });
 
      const filteredFlagged = reviews.filter(r => r.status === 'flagged');
 
      set({ reviews, pendingReviews: [], flaggedReviews: filteredFlagged, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      set({ isLoading: false, error: err.message || 'Failed to load reviews' });
    }
  },
 
  approveReview: async (id) => {
    // For post-moderation, "approve" means "make visible/unflag"
    set({ isLoading: true, error: null });
    try {
      const { reviewService } = await import('@/services/reviewService');
      await reviewService.updateReviewHiddenStatus(id, false);
 
      set(state => {
        const updatedReviews = state.reviews.map(review =>
          review.id === id ? { ...review, status: 'approved' as const } : review
        );
        return {
          reviews: updatedReviews,
          flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
          isLoading: false
        };
      });
    } catch (err: any) {
      console.error('Failed to approve review:', err);
      set({ isLoading: false, error: err.message || 'Failed to approve review' });
    }
  },
 
  rejectReview: async (id, reason) => {
    // For post-moderation, "reject" means "hide/flag"
    set({ isLoading: true, error: null });
    try {
      const { reviewService } = await import('@/services/reviewService');
      await reviewService.updateReviewHiddenStatus(id, true);
 
      set(state => {
        const updatedReviews = state.reviews.map(review =>
          review.id === id ? { ...review, status: 'flagged' as const, moderationNote: reason } : review
        );
        return {
          reviews: updatedReviews,
          flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
          isLoading: false
        };
      });
    } catch (err: any) {
      console.error('Failed to reject review:', err);
      set({ isLoading: false, error: err.message || 'Failed to reject review' });
    }
  },

  flagReview: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      const { reviewService } = await import('@/services/reviewService');
      await reviewService.updateReviewHiddenStatus(id, true);
 
      set(state => {
        const updatedReviews = state.reviews.map(review =>
          review.id === id ? { ...review, status: 'flagged' as const, moderationNote: reason } : review
        );
        return {
          reviews: updatedReviews,
          flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
          isLoading: false
        };
      });
    } catch (err: any) {
      console.error('Failed to flag review:', err);
      set({ isLoading: false, error: err.message || 'Failed to flag review' });
    }
  },
 
  unflagReview: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { reviewService } = await import('@/services/reviewService');
      await reviewService.updateReviewHiddenStatus(id, false);
 
      set(state => {
        const updatedReviews = state.reviews.map(review =>
          review.id === id ? { ...review, status: 'approved' as const, moderationNote: undefined } : review
        );
        return {
          reviews: updatedReviews,
          flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
          isLoading: false
        };
      });
    } catch (err: any) {
      console.error('Failed to unflag review:', err);
      set({ isLoading: false, error: err.message || 'Failed to unflag review' });
    }
  },
 
  deleteReview: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { reviewService } = await import('@/services/reviewService');
      await reviewService.deleteReviewAdmin(id);
 
      set(state => ({
        reviews: state.reviews.filter(r => r.id !== id),
        pendingReviews: state.pendingReviews.filter(r => r.id !== id),
        flaggedReviews: state.flaggedReviews.filter(r => r.id !== id),
        selectedReview: state.selectedReview?.id === id ? null : state.selectedReview,
        isLoading: false
      }));
    } catch (err: any) {
      console.error('Failed to delete review:', err);
      set({ isLoading: false, error: err.message || 'Failed to delete review' });
    }
  },

  selectReview: (review) => set({ selectedReview: review }),
  clearError: () => set({ error: null })
}));
