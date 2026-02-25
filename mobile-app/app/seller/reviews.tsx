import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { useAuthStore } from '../../src/stores/authStore';
import { reviewService, type ReviewFeedItem } from '../../src/services/reviewService';
import {
  ArrowLeft,
  Star,
  MessageSquare,
  ThumbsUp,
  Search,
  Reply,
  Flag,
  Check,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { safeImageUri, PLACEHOLDER_PRODUCT, PLACEHOLDER_AVATAR } from '../../src/utils/imageUtils';

interface ReviewStats {
  total: number;
  average: string;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
  needsReply: number;
  withPhotos: number;
}

const BRAND = '#D97706';

export default function ReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<'all' | number>('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewFeedItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [reviews, setReviews] = useState<ReviewFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeReplyModal = () => {
    setShowReplyModal(false);
    setSelectedReview(null);
    setReplyText('');
  };

  const showSuccessToast = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const loadReviews = useCallback(async (isRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await reviewService.getSellerReviews(user.id);
      setReviews(data);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Failed to load reviews. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReviews(true);
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        review.productName.toLowerCase().includes(query) ||
        review.buyerName.toLowerCase().includes(query) ||
        (review.comment || '').toLowerCase().includes(query);

      const matchesFilter = filterRating === 'all' || review.rating === filterRating;
      return matchesSearch && matchesFilter;
    });
  }, [reviews, searchQuery, filterRating]);

  const reviewStats: ReviewStats = useMemo(() => {
    const total = reviews.length;
    const average =
      total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : '0.0';

    return {
      total,
      average,
      fiveStar: reviews.filter((r) => r.rating === 5).length,
      fourStar: reviews.filter((r) => r.rating === 4).length,
      threeStar: reviews.filter((r) => r.rating === 3).length,
      twoStar: reviews.filter((r) => r.rating === 2).length,
      oneStar: reviews.filter((r) => r.rating === 1).length,
      needsReply: reviews.filter((r) => !r.sellerReply).length,
      withPhotos: reviews.filter((r) => r.images.length > 0).length,
    };
  }, [reviews]);

  const handleReply = (review: ReviewFeedItem) => {
    setSelectedReview(review);
    setReplyText(review.sellerReply?.message || '');
    setShowReplyModal(true);
  };

  const submitReply = async () => {
    if (!selectedReview || !user?.id || !replyText.trim()) return;

    setSubmitting(true);
    try {
      const updated = await reviewService.addSellerReply(selectedReview.id, user.id, replyText.trim());
      if (updated) {
        setReviews((prev) => prev.map((item) => (item.id === selectedReview.id ? updated : item)));
      } else {
        await loadReviews(true);
      }

      closeReplyModal();
      showSuccessToast('Reply posted successfully.');
    } catch (err) {
      console.error('Error submitting reply:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to submit reply.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (review: ReviewFeedItem) => {
    if (!user?.id) return;

    Alert.alert('Delete Reply', 'Are you sure you want to delete your reply?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await reviewService.deleteSellerReply(review.id, user.id);
            if (updated) {
              setReviews((prev) => prev.map((item) => (item.id === review.id ? updated : item)));
            } else {
              await loadReviews(true);
            }
            showSuccessToast('Reply deleted.');
          } catch (err) {
            console.error('Error deleting reply:', err);
            Alert.alert('Error', 'Failed to delete reply. Please try again.');
          }
        },
      },
    ]);
  };

  const handleReport = (review: ReviewFeedItem) => {
    Alert.alert('Report Review', `Reported review from ${review.buyerName}. Our team will review this content.`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number, size = 14) => (
    <View style={styles.starsRow}>
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={size}
          color={i < rating ? '#FBBF24' : '#D1D5DB'}
          fill={i < rating ? '#FBBF24' : '#D1D5DB'}
          strokeWidth={0}
        />
      ))}
    </View>
  );

  const ratingRows = [5, 4, 3, 2, 1].map((rating) => {
    const count =
      rating === 5
        ? reviewStats.fiveStar
        : rating === 4
          ? reviewStats.fourStar
          : rating === 3
            ? reviewStats.threeStar
            : rating === 2
              ? reviewStats.twoStar
              : reviewStats.oneStar;

    const percentage = reviewStats.total > 0 ? (count / reviewStats.total) * 100 : 0;
    return { rating, count, percentage };
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowLeft size={22} color="#1F2937" strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Reviews & Ratings</Text>
            <Text style={styles.headerSubtitle}>Manage customer feedback and respond to reviews</Text>
          </View>
          <Pressable onPress={() => loadReviews()} style={styles.iconButton}>
            <RefreshCw size={20} color="#1F2937" strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} />}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#DC2626" strokeWidth={2.5} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => loadReviews()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF8E7' }]}>
              <Star size={18} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
            </View>
            <Text style={styles.statValue}>{reviewStats.average}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
            <View style={{ marginTop: 4 }}>{renderStars(Math.round(Number(reviewStats.average)), 11)}</View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <MessageSquare size={18} color="#2563EB" strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{reviewStats.total}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
            <Text style={styles.statMeta}>{reviewStats.withPhotos} with photos</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF4EC' }]}>
              <Reply size={18} color="#EA580C" strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{reviewStats.needsReply}</Text>
            <Text style={styles.statLabel}>Needs Reply</Text>
            <Text style={styles.statMeta}>
              {reviewStats.total > 0 ? Math.round((reviewStats.needsReply / reviewStats.total) * 100) : 0}% pending
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <ThumbsUp size={18} color="#16A34A" strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{reviewStats.fiveStar}</Text>
            <Text style={styles.statLabel}>5 Star Reviews</Text>
            <Text style={styles.statMeta}>
              {reviewStats.total > 0 ? Math.round((reviewStats.fiveStar / reviewStats.total) * 100) : 0}% of total
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rating Distribution</Text>
          <View style={styles.distributionList}>
            {ratingRows.map((row) => (
              <View key={row.rating} style={styles.distributionRow}>
                <View style={styles.distributionRating}>
                  <Text style={styles.distributionRatingText}>{row.rating}</Text>
                  <Star size={12} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
                </View>
                <View style={styles.distributionTrack}>
                  <View style={[styles.distributionFill, { width: `${row.percentage}%` }]} />
                </View>
                <Text style={styles.distributionCount}>{row.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.searchBar}>
            <Search size={16} color="#9CA3AF" strokeWidth={2.2} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by product, customer, or keywords"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
            {(['all', 5, 4, 3, 2, 1] as const).map((rating) => {
              const active = filterRating === rating;
              return (
                <Pressable
                  key={String(rating)}
                  onPress={() => setFilterRating(rating)}
                  style={[styles.ratingChip, active && styles.ratingChipActive]}
                >
                  <Text style={[styles.ratingChipText, active && styles.ratingChipTextActive]}>
                    {rating === 'all' ? 'All Ratings' : `${rating} Stars`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.reviewList}>
          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={40} color="#9CA3AF" strokeWidth={1.8} />
              <Text style={styles.emptyTitle}>No reviews found</Text>
              <Text style={styles.emptyText}>
                {searchQuery || filterRating !== 'all'
                  ? 'Try adjusting your search or rating filters.'
                  : 'Reviews will appear here when customers leave feedback.'}
              </Text>
            </View>
          ) : (
            filteredReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.productRow}>
                  <Image
                    source={{ uri: safeImageUri(review.productImage, PLACEHOLDER_PRODUCT) }}
                    style={styles.productImage}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={2}>{review.productName}</Text>
                    <View style={styles.productMetaRow}>
                      {renderStars(review.rating, 12)}
                      <Text style={styles.dot}>•</Text>
                      <Text style={styles.dateText}>{formatDate(review.createdAt)}</Text>
                    </View>
                    {review.verifiedPurchase && (
                      <View style={styles.verifiedPill}>
                        <Check size={10} color="#16A34A" strokeWidth={3} />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.customerRow}>
                  <Image
                    source={{ uri: safeImageUri(review.buyerAvatar, PLACEHOLDER_AVATAR) }}
                    style={styles.customerAvatar}
                  />
                  <View>
                    <Text style={styles.customerName}>{review.buyerName}</Text>
                    <Text style={styles.customerMeta}>Customer</Text>
                  </View>
                </View>

                <View style={styles.commentBox}>
                  <Text style={styles.commentText}>"{review.comment || 'No comment provided'}"</Text>
                </View>

                {review.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {review.images.map((img, idx) => (
                      <Image key={`${review.id}-${idx}`} source={{ uri: img }} style={styles.reviewImage} />
                    ))}
                  </ScrollView>
                )}

                <View style={styles.helpfulRow}>
                  <ThumbsUp size={13} color="#6B7280" strokeWidth={2.2} />
                  <Text style={styles.helpfulText}>{review.helpfulCount} found helpful</Text>
                </View>

                {review.sellerReply ? (
                  <View style={styles.replyBox}>
                    <View style={styles.replyHeader}>
                      <View style={styles.replyTitleWrap}>
                        <Reply size={13} color={BRAND} strokeWidth={2.5} />
                        <Text style={styles.replyTitle}>Your Response</Text>
                      </View>
                      <Text style={styles.replyDate}>{formatDate(review.sellerReply.repliedAt)}</Text>
                    </View>
                    <Text style={styles.replyMessage}>{review.sellerReply.message}</Text>
                    <View style={styles.replyActionRow}>
                      <Pressable style={styles.inlineAction} onPress={() => handleReply(review)}>
                        <Reply size={13} color={BRAND} strokeWidth={2.3} />
                        <Text style={styles.inlineActionText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.inlineAction} onPress={() => handleDeleteReply(review)}>
                        <Trash2 size={13} color="#DC2626" strokeWidth={2.3} />
                        <Text style={[styles.inlineActionText, { color: '#DC2626' }]}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyReplyActionRow}>
                    <Pressable style={styles.replyPrimaryButton} onPress={() => handleReply(review)}>
                      <Reply size={14} color="#FFFFFF" strokeWidth={2.4} />
                      <Text style={styles.replyPrimaryText}>Reply to Review</Text>
                    </Pressable>
                    <Pressable style={styles.reportButton} onPress={() => handleReport(review)}>
                      <Flag size={14} color="#6B7280" strokeWidth={2.3} />
                      <Text style={styles.reportText}>Report</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showReplyModal} transparent animationType="slide" onRequestClose={closeReplyModal}>
        <Pressable style={styles.modalOverlay} onPress={closeReplyModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboardWrap}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{selectedReview?.sellerReply ? 'Edit Reply' : 'Reply to Review'}</Text>

              {selectedReview && (
                <View style={styles.modalReviewPreview}>
                  <Text style={styles.modalReviewLabel}>Review from {selectedReview.buyerName}:</Text>
                  <Text style={styles.modalReviewText} numberOfLines={3}>
                    "{selectedReview.comment || 'No comment'}"
                  </Text>
                </View>
              )}

              <TextInput
                style={styles.modalInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write your response to the customer..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!submitting}
                autoFocus
              />

              <View style={styles.modalActionRow}>
                <Pressable style={styles.modalCancelButton} onPress={closeReplyModal} disabled={submitting}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSubmitButton, (!replyText.trim() || submitting) && { opacity: 0.65 }]}
                  onPress={submitReply}
                  disabled={!replyText.trim() || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>
                      {selectedReview?.sellerReply ? 'Update Reply' : 'Send Reply'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {showSuccess && (
        <View style={[styles.toastWrap, { top: insets.top + 12 }]}> 
          <View style={styles.toast}>
            <Check size={16} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.toastText}>{successMessage}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFF4EC',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 3,
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2EB',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  errorBox: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    paddingHorizontal: 16,
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E8E2',
    padding: 12,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    marginTop: 2,
  },
  statMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  sectionCard: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E8E2',
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 10,
  },
  distributionList: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distributionRating: {
    width: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distributionRatingText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
  },
  distributionTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FBBF24',
  },
  distributionCount: {
    width: 24,
    textAlign: 'right',
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  filterCard: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E8E2',
    padding: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },
  ratingChip: {
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  ratingChipActive: {
    borderColor: BRAND,
    backgroundColor: '#FFF1EB',
  },
  ratingChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  ratingChipTextActive: {
    color: BRAND,
  },
  reviewList: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E8E2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3E8E2',
    padding: 14,
    marginBottom: 12,
  },
  productRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  productMetaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  dot: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  verifiedPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifiedText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#FFF4EC',
    borderRadius: 12,
    padding: 10,
  },
  customerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E7EB',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  customerMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  commentBox: {
    backgroundColor: '#FFF4EC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 10,
    marginBottom: 10,
  },
  commentText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  reviewImage: {
    width: 78,
    height: 78,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  helpfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  helpfulText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  replyBox: {
    backgroundColor: '#FFF6F1',
    borderWidth: 1,
    borderColor: '#FED7C5',
    borderRadius: 12,
    padding: 10,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  replyTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  replyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND,
  },
  replyDate: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  replyMessage: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  replyActionRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: BRAND,
  },
  emptyReplyActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  replyPrimaryButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  replyPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reportButton: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  reportText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalKeyboardWrap: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalReviewPreview: {
    backgroundColor: '#FFF4EC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginBottom: 12,
  },
  modalReviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalReviewText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
  },
  modalInput: {
    backgroundColor: '#FFF4EC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    color: '#111827',
    fontSize: 14,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSubmitButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 90,
  },
  toast: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
