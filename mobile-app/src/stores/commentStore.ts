/**
 * Comment Store (Mobile)
 * Manages product request comments & contributor system state.
 * Server-side state — no persistence needed.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

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
  content: string | null;   // null = sourcing comment masked from non-admin
  isAdminOnly: boolean;
  bcAwarded: number;
  upvotes: number;
  adminUpvotes: number;
  hasUpvoted: boolean;
  createdAt: string;
}

interface CommentStore {
  comments: Comment[];
  isLoading: boolean;
  isPosting: boolean;
  currentRequestId: string | null;

  fetchComments: (requestId: string, viewerUserId: string | null) => Promise<void>;
  postComment: (requestId: string, type: CommentType, content: string) => Promise<boolean>;
  upvoteComment: (commentId: string) => Promise<void>;
  clearComments: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRow(row: any, viewerUserId: string | null): Comment {
  const first = row.profiles?.first_name ?? '';
  const last  = row.profiles?.last_name  ?? '';
  const userName = [first, last].filter(Boolean).join(' ') || 'Anonymous';

  return {
    id:           row.id,
    requestId:    row.request_id,
    userId:       row.user_id,
    userName,
    userTier:     'none' as ContributorTier,
    type:         row.type as CommentType,
    content:      row.is_admin_only ? null : row.content,
    isAdminOnly:  row.is_admin_only,
    bcAwarded:    row.bc_awarded ?? 0,
    upvotes:      row.upvotes ?? 0,
    adminUpvotes: row.admin_upvotes ?? 0,
    hasUpvoted:   viewerUserId
      ? (row.comment_upvotes ?? []).some((u: any) => u.user_id === viewerUserId)
      : false,
    createdAt:    row.created_at,
  };
}

const SELECT_QUERY = `
  id, request_id, user_id, type, content,
  is_admin_only, bc_awarded, upvotes, admin_upvotes, created_at,
  profiles (first_name, last_name),
  comment_upvotes (user_id)
`;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCommentStore = create<CommentStore>((set, get) => ({
  comments: [],
  isLoading: false,
  isPosting: false,
  currentRequestId: null,

  fetchComments: async (requestId, viewerUserId) => {
    set({ isLoading: true, currentRequestId: requestId });

    const { data, error } = await supabase
      .from('product_request_comments')
      .select(SELECT_QUERY)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fetchComments error:', error.message);
      set({ isLoading: false });
      return;
    }

    const comments = (data ?? []).map((row: any) => mapRow(row, viewerUserId));
    set({ comments, isLoading: false });
  },

  postComment: async (requestId, type, content) => {
    set({ isPosting: true });

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      set({ isPosting: false });
      return false;
    }

    const { data, error } = await supabase.functions.invoke('post-comment', {
      body: { request_id: requestId, type, content },
    });

    if (error || !data?.comment) {
      console.error('postComment error:', error?.message ?? data?.error);
      set({ isPosting: false });
      return false;
    }

    // Re-fetch to get full joined comment
    const { data: refetch } = await supabase
      .from('product_request_comments')
      .select(SELECT_QUERY)
      .eq('id', data.comment.id)
      .single();

    if (refetch) {
      const newComment = mapRow(refetch, sessionData.session.user.id);
      set((s) => ({ comments: [...s.comments, newComment], isPosting: false }));
    } else {
      set({ isPosting: false });
    }

    return true;
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

    const { data, error } = await supabase.functions.invoke('upvote-comment', {
      body: { comment_id: commentId },
    });

    if (error || !data?.success) {
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
