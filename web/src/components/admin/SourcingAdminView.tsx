import React, { useState } from 'react';
import { Coins, ThumbsUp, ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContributorBadge } from '@/components/ui/ContributorBadge';
import { supabase } from '@/lib/supabase';
import type { Comment } from '@/stores/commentStore';

interface SourcingAdminViewProps {
  comments: Comment[];
  onLabUpvote: (commentId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Simple heuristic: looks like a URL
function extractLinks(content: string): string[] {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return content.match(urlRegex) ?? [];
}

export const SourcingAdminView: React.FC<SourcingAdminViewProps> = ({ comments, onLabUpvote }) => {
  const [awarding, setAwarding] = useState<string | null>(null);
  const [bonusAmt, setBonusAmt] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAwardBonus = async (comment: Comment) => {
    const amt = parseInt(bonusAmt[comment.id] ?? '50', 10);
    if (isNaN(amt) || amt <= 0) return;

    setAwarding(comment.id);
    try {
      const { error } = await supabase.functions.invoke('award-bc', {
        body: {
          user_id: comment.userId,
          amount: amt,
          reason: 'sourcing_bonus',
          reference_id: comment.id,
          reference_type: 'product_request_comment',
        },
      });
      if (error) throw error;
      showToast(`+${amt} BC awarded to ${comment.userName}`);
      setBonusAmt((prev) => ({ ...prev, [comment.id]: '' }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed: ${message}`);
    } finally {
      setAwarding(null);
    }
  };

  if (comments.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-400">
        No sourcing tips submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => {
        const links = extractLinks(c.content ?? '');
        return (
          <div
            key={c.id}
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">
                  🔒 ADMIN-ONLY  •  🔗 Sourcing
                </span>
                <ContributorBadge tier={c.userTier} size="sm" />
              </div>
              <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
            </div>

            {/* Author */}
            <div className="flex items-center gap-1.5 text-sm text-gray-700">
              <User size={13} className="text-gray-400" />
              <span className="font-semibold">{c.userName}</span>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>

            {/* Extracted links */}
            {links.length > 0 && (
              <div className="space-y-1">
                {links.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink size={11} />
                    {url.length > 70 ? `${url.slice(0, 70)}…` : url}
                  </a>
                ))}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1 border-t border-amber-200">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-xs gap-1 border-amber-400 text-amber-700 hover:bg-amber-100"
                  onClick={() => onLabUpvote(c.id)}
                >
                  <ThumbsUp size={12} />
                  Lab upvote ({c.adminUpvotes})
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  placeholder="BC amount"
                  value={bonusAmt[c.id] ?? ''}
                  onChange={(e) =>
                    setBonusAmt((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  className="w-24 h-7 rounded border border-amber-300 bg-white px-2 text-xs"
                />
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => handleAwardBonus(c)}
                  disabled={awarding === c.id}
                >
                  <Coins size={12} />
                  {awarding === c.id ? '...' : 'Award Bonus BC'}
                </Button>
              </div>
            </div>

            {/* BC earned */}
            <div className="text-xs text-gray-500">
              BC earned on submit: <span className="font-semibold text-amber-700">+{c.bcAwarded}</span>
            </div>
          </div>
        );
      })}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};
