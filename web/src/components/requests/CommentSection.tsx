import React, { useEffect } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { CommentCard } from './CommentCard';
import { CommentForm } from './CommentForm';
import { useCommentStore } from '@/stores/commentStore';

interface CommentSectionProps {
  requestId: string;
  viewerUserId: string | null;
  isAdminViewer?: boolean;
  showForm?: boolean;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  requestId,
  viewerUserId,
  isAdminViewer = false,
  showForm = true,
}) => {
  const { comments, isLoading, fetchComments, fetchCommentsAdmin, clearComments } =
    useCommentStore();

  useEffect(() => {
    if (isAdminViewer) {
      fetchCommentsAdmin(requestId, viewerUserId);
    } else {
      fetchComments(requestId, viewerUserId);
    }

    return () => clearComments();
    // fetchComments/fetchCommentsAdmin/clearComments are Zustand actions (stable refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, viewerUserId, isAdminViewer]);

  const publicComments = comments.filter((c) => !c.isAdminOnly);
  const sourcingComments = comments.filter((c) => c.isAdminOnly);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-gray-500" />
        <h3 className="text-base font-semibold text-gray-800">
          Contributions
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({comments.length})
          </span>
        </h3>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* Sourcing section — only shown to admin/lab */}
      {!isLoading && isAdminViewer && sourcingComments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            🔒 Sourcing Tips ({sourcingComments.length})
          </p>
          {sourcingComments.map((c) => (
            <CommentCard key={c.id} comment={c} isAdminViewer={isAdminViewer} />
          ))}
        </div>
      )}

      {/* Public comments */}
      {!isLoading && (
        <div className="space-y-2">
          {!isAdminViewer && sourcingComments.length > 0 && (
            <div className="space-y-2">
              {sourcingComments.map((c) => (
                <CommentCard key={c.id} comment={c} isAdminViewer={false} />
              ))}
            </div>
          )}
          {publicComments.map((c) => (
            <CommentCard key={c.id} comment={c} isAdminViewer={isAdminViewer} />
          ))}
          {comments.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">
              No contributions yet. Be the first to contribute!
            </div>
          )}
        </div>
      )}

      {/* Post form */}
      {showForm && viewerUserId && !isLoading && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">Add your contribution</p>
          <CommentForm requestId={requestId} />
        </div>
      )}
    </div>
  );
};
