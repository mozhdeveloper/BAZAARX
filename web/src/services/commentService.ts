/**
 * Comment Service
 * Handles all data access for product request comments and contributor tiers.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Comment, ContributorTier } from '@/stores/commentStore';

// ─── Types returned from the DB join ───────────────────────────────────────

interface RawCommentRow {
  id: string;
  request_id: string;
  user_id: string;
  type: string;
  content: string | null;
  is_admin_only: boolean;
  bc_awarded: number;
  upvotes: number;
  admin_upvotes: number;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  contributor_tiers: {
    tier: ContributorTier;
  } | null;
  comment_upvotes: { user_id: string }[];
}

function mapRow(row: RawCommentRow, viewerUserId: string | null): Comment {
  const first = row.profiles?.first_name ?? '';
  const last  = row.profiles?.last_name  ?? '';
  const userName = [first, last].filter(Boolean).join(' ') || 'Anonymous';

  return {
    id:           row.id,
    requestId:    row.request_id,
    userId:       row.user_id,
    userName,
    userTier:     (row.contributor_tiers?.tier as ContributorTier) ?? 'none',
    type:         row.type as Comment['type'],
    content:      row.content,      // null for sourcing if masked server-side
    isAdminOnly:  row.is_admin_only,
    bcAwarded:    row.bc_awarded,
    upvotes:      row.upvotes,
    adminUpvotes: row.admin_upvotes,
    hasUpvoted:   viewerUserId
      ? (row.comment_upvotes ?? []).some((u) => u.user_id === viewerUserId)
      : false,
    createdAt:    row.created_at,
  };
}

class CommentService {
  /**
   * Fetch all comments for a product request (public non-admin call).
   * Sourcing comments are returned with content = null unless the caller is admin/lab.
   */
  async getComments(requestId: string, viewerUserId: string | null): Promise<Comment[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('product_request_comments')
      .select(`
        id, request_id, user_id, type, content,
        is_admin_only, bc_awarded, upvotes, admin_upvotes, created_at,
        profiles (first_name, last_name),
        contributor_tiers (tier),
        comment_upvotes (user_id)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getComments error:', error.message);
      return [];
    }

    return (data ?? []).map((row: RawCommentRow) => {
      // Mask sourcing content client-side as extra precaution
      const maskedRow = { ...row };
      if (row.is_admin_only) maskedRow.content = null;
      return mapRow(maskedRow, viewerUserId);
    });
  }

  /**
   * Fetch all comments for a product request for admin/lab users.
   * Returns full content including sourcing details.
   */
  async getCommentsAdmin(requestId: string, viewerUserId: string | null): Promise<Comment[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('product_request_comments')
      .select(`
        id, request_id, user_id, type, content,
        is_admin_only, bc_awarded, upvotes, admin_upvotes, created_at,
        profiles (first_name, last_name),
        contributor_tiers (tier),
        comment_upvotes (user_id)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getCommentsAdmin error:', error.message);
      return [];
    }

    return (data ?? []).map((row: RawCommentRow) => mapRow(row, viewerUserId));
  }

  /**
   * Post a new comment via the post-comment edge function.
   */
  async postComment(
    requestId: string,
    type: Comment['type'],
    content: string
  ): Promise<Comment | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data, error } = await supabase.functions.invoke('post-comment', {
      body: { request_id: requestId, type, content },
    });

    if (error || !data?.comment) {
      console.error('postComment error:', error?.message ?? data?.error);
      return null;
    }

    // Re-fetch the mapped comment so it has joined profile/tier data
    const comments = await this.getCommentsAdmin(requestId, session.user.id);
    return comments.find((c) => c.id === data.comment.id) ?? null;
  }

  /**
   * Upvote a comment via the upvote-comment edge function.
   */
  async upvoteComment(commentId: string): Promise<{ success: boolean; newCount: number }> {
    const { data, error } = await supabase.functions.invoke('upvote-comment', {
      body: { comment_id: commentId },
    });

    if (error || !data?.success) {
      const msg = error?.message ?? data?.error ?? 'Failed to upvote';
      console.error('upvoteComment error:', msg);
      return { success: false, newCount: 0 };
    }

    return { success: true, newCount: data.new_count };
  }

  /**
   * Get contributor tier for a user.
   */
  async getContributorTier(userId: string): Promise<{ tier: ContributorTier; maxUpvotes: number; bcMultiplier: number } | null> {
    const { data, error } = await supabase
      .from('contributor_tiers')
      .select('tier, max_upvotes, bc_multiplier')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      tier:         data.tier as ContributorTier,
      maxUpvotes:   data.max_upvotes,
      bcMultiplier: Number(data.bc_multiplier),
    };
  }
}

export const commentService = new CommentService();
