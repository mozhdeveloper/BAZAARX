import React from 'react';
import { ThumbsUp, Lock, Link2, Shield, MessageCircle } from 'lucide-react';
import { ContributorBadge } from '@/components/ui/ContributorBadge';
import { Button } from '@/components/ui/button';
import { useCommentStore, type Comment } from '@/stores/commentStore';

interface CommentCardProps {
  comment: Comment;
  isAdminViewer?: boolean;
}

const TYPE_CONFIG = {
  sourcing: { icon: Link2,       label: 'Sourcing',         color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  qc:       { icon: Shield,      label: 'QC Tip',           color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-300' },
  general:  { icon: MessageCircle, label: 'General',        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment, isAdminViewer = false }) => {
  const upvoteComment = useCommentStore((s) => s.upvoteComment);
  const cfg = TYPE_CONFIG[comment.type];
  const Icon = cfg.icon;
  const isSourcingMasked = comment.isAdminOnly && !isAdminViewer;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-2`}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {comment.isAdminOnly && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
              <Lock size={10} />
              {isAdminViewer ? 'ADMIN-ONLY' : 'SOURCING TIP'}
            </span>
          )}
          <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
            <Icon size={12} />
            {cfg.label}
          </span>
        </div>
        <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
      </div>

      {/* Author row */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
        <span>{comment.userName}</span>
        <ContributorBadge tier={comment.userTier} size="sm" />
      </div>

      {/* Content */}
      {isSourcingMasked ? (
        <p className="text-sm text-gray-500 italic">
          Sourcing intelligence submitted to the Lab team (details visible to team only).
        </p>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {comment.isAdminOnly ? (
            <span>👍 {comment.adminUpvotes} Lab upvotes</span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs gap-1 ${comment.hasUpvoted ? 'text-[#FF6A00]' : 'text-gray-500 hover:text-[#FF6A00]'}`}
              onClick={() => upvoteComment(comment.id)}
              disabled={comment.hasUpvoted}
            >
              <ThumbsUp size={13} />
              {comment.upvotes}
            </Button>
          )}
        </div>
        {comment.bcAwarded > 0 && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
            +{comment.bcAwarded} BC
          </span>
        )}
      </div>
    </div>
  );
};
