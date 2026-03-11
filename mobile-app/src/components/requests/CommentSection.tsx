import React, { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useCommentStore } from '@/stores/commentStore';
import { CommentCard } from '@/components/requests/CommentCard';
import { CommentForm } from '@/components/requests/CommentForm';
import { COLORS } from '@/constants/theme';

interface CommentSectionProps {
  requestId: string;
  viewerUserId: string | null;
  showForm?: boolean;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  requestId,
  viewerUserId,
  showForm = false,
}) => {
  const { comments, isLoading, fetchComments, clearComments } = useCommentStore();

  useEffect(() => {
    fetchComments(requestId, viewerUserId);
    return () => clearComments();
  }, [requestId]);

  const publicComments = comments.filter((c) => !c.isAdminOnly);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading contributions…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Community Contributions ({publicComments.length})
      </Text>

      {publicComments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No contributions yet.</Text>
          <Text style={styles.emptySubText}>Be the first to share insights!</Text>
        </View>
      ) : (
        publicComments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} />
        ))
      )}

      {showForm && viewerUserId && (
        <View style={styles.formWrapper}>
          <Text style={styles.formTitle}>Add Your Contribution</Text>
          <CommentForm requestId={requestId} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textHeadline,
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  formWrapper: {
    marginTop: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textHeadline,
    marginBottom: 10,
  },
});
