import { create } from 'zustand';
import { commentService } from '@/services/commentService';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CommentType = 'sourcing' | 'qc' | 'general';
export type ContributorTier = 'none' | 'bronze' | 'silver' | 'gold';

export interface Comment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userTier: ContributorTier;
  type: CommentType;
  content: string | null;   // null = sourcing comment, viewer is not admin/lab
  isAdminOnly: boolean;
  bcAwarded: number;
  upvotes: number;
  adminUpvotes: number;
  hasUpvoted: boolean;
  createdAt: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface CommentStore {
  comments: Comment[];
  isLoading: boolean;
  isPosting: boolean;
  currentRequestId: string | null;
  isAdmin: boolean;   // caller is admin/lab — determines which fetch method is used

  setIsAdmin: (v: boolean) => void;
  fetchComments: (requestId: string, viewerUserId: string | null) => Promise<void>;
  fetchCommentsAdmin: (requestId: string, viewerUserId: string | null) => Promise<void>;
  postComment: (requestId: string, type: CommentType, content: string) => Promise<boolean>;
  upvoteComment: (commentId: string) => Promise<void>;
  clearComments: () => void;
}

export const useCommentStore = create<CommentStore>((set, get) => ({
  comments: [],
  isLoading: false,
  isPosting: false,
  currentRequestId: null,
  isAdmin: false,

  setIsAdmin: (v) => set({ isAdmin: v }),

  fetchComments: async (requestId, viewerUserId) => {
    set({ isLoading: true, currentRequestId: requestId });
    const comments = await commentService.getComments(requestId, viewerUserId);
    set({ comments, isLoading: false });
  },

  fetchCommentsAdmin: async (requestId, viewerUserId) => {
    set({ isLoading: true, currentRequestId: requestId });
    const comments = await commentService.getCommentsAdmin(requestId, viewerUserId);
    set({ comments, isLoading: false });
  },

  postComment: async (requestId, type, content) => {
    set({ isPosting: true });
    const newComment = await commentService.postComment(requestId, type, content);
    if (newComment) {
      set((s) => ({ comments: [...s.comments, newComment], isPosting: false }));
      return true;
    }
    set({ isPosting: false });
    return false;
  },

  upvoteComment: async (commentId) => {
    const { comments } = get();
    const comment = comments.find((c) => c.id === commentId);
    if (!comment || comment.hasUpvoted) return;

    // Optimistic update
    set({
      comments: comments.map((c) =>
        c.id === commentId
          ? { ...c, upvotes: c.upvotes + 1, hasUpvoted: true }
          : c
      ),
    });

    const result = await commentService.upvoteComment(commentId);
    if (!result.success) {
      // Rollback
      set({
        comments: get().comments.map((c) =>
          c.id === commentId
            ? { ...c, upvotes: c.upvotes - 1, hasUpvoted: false }
            : c
        ),
      });
    }
  },

  clearComments: () => set({ comments: [], currentRequestId: null }),
}));
