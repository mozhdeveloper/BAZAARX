import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ThumbsUp, Lock } from 'lucide-react-native';
import { ContributorBadge } from '@/components/ContributorBadge';
import { useCommentStore } from '@/stores/commentStore';
import type { Comment } from '@/stores/commentStore';
import { COLORS } from '@/constants/theme';

interface CommentCardProps {
  comment: Comment;
  isAdminViewer?: boolean;
}

const TYPE_LABELS: Record<Comment['type'], string> = {
  sourcing: 'Sourcing',
  qc:       'QC',
  general:  'General',
};

const TYPE_COLORS: Record<Comment['type'], { bg: string; text: string }> = {
  sourcing: { bg: '#FFF7ED', text: '#C2410C' },
  qc:       { bg: '#F0FDF4', text: '#166534' },
  general:  { bg: '#EFF6FF', text: '#1D4ED8' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment, isAdminViewer = false }) => {
  const { upvoteComment } = useCommentStore();

  const isMasked = comment.isAdminOnly && !isAdminViewer;
  const typeColor = TYPE_COLORS[comment.type];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          <Text style={styles.authorName}>{comment.userName}</Text>
          <ContributorBadge tier={comment.userTier} size="sm" />
        </View>
        <View style={[styles.typePill, { backgroundColor: typeColor.bg }]}>
          <Text style={[styles.typeText, { color: typeColor.text }]}>
            {TYPE_LABELS[comment.type]}
          </Text>
        </View>
      </View>

      {/* Content */}
      {isMasked ? (
        <View style={styles.maskedRow}>
          <Lock size={14} color={COLORS.textMuted} />
          <Text style={styles.maskedText}>
            Sourcing intelligence submitted to the Lab team
          </Text>
        </View>
      ) : (
        <Text style={styles.content}>{comment.content}</Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.date}>{formatDate(comment.createdAt)}</Text>
        <View style={styles.footerRight}>
          {comment.bcAwarded > 0 && (
            <View style={styles.bcBadge}>
              <Text style={styles.bcText}>+{comment.bcAwarded} BC</Text>
            </View>
          )}
          {!isMasked && (
            <Pressable
              style={[styles.upvoteBtn, comment.hasUpvoted && styles.upvotedBtn]}
              onPress={() => !comment.hasUpvoted && upvoteComment(comment.id)}
              disabled={comment.hasUpvoted}
            >
              <ThumbsUp
                size={13}
                color={comment.hasUpvoted ? '#2563EB' : COLORS.textMuted}
                strokeWidth={2}
              />
              <Text style={[styles.upvoteCount, comment.hasUpvoted && styles.upvotedCount]}>
                {comment.upvotes}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textHeadline,
  },
  typePill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  maskedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  maskedText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  content: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  bcBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bcText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  upvotedBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  upvoteCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  upvotedCount: {
    color: '#2563EB',
  },
});
