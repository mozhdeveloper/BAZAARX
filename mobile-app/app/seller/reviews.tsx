import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import { reviewService, Review } from '../../src/services/reviewService';
import { supabase } from '../../src/lib/supabase';
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
  Edit3,
  RefreshCw,
} from 'lucide-react-native';
import { safeImageUri, PLACEHOLDER_PRODUCT, PLACEHOLDER_AVATAR } from '../../src/utils/imageUtils';

// Extended review interface for UI with buyer info
interface ReviewWithDetails extends Review {
  productName: string;
  productImage: string | null;
  buyerName: string;
  buyerAvatar: string;
  // Convenience aliases for UI (map to Review fields)
  reply?: any;  // Maps to seller_reply
  verified?: boolean;  // Maps to is_verified_purchase
  date?: Date;  // Maps to created_at (converted to Date)
  helpful?: number;  // Maps to helpful_count
}

export default function ReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<'all' | number>('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithDetails | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, [user?.id]);

  const loadReviews = async (isRefreshing = false) => {
    if (!user?.id) return;
    
    if (!isRefreshing) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await reviewService.getSellerReviews(user.id);
      
      // Map reviews with buyer info
      const mappedReviews: ReviewWithDetails[] = await Promise.all(
        data.map(async (r: any) => {
          // Fetch buyer profile info
          let buyerName = 'Anonymous Buyer';
          let buyerAvatar = PLACEHOLDER_AVATAR;
          
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', r.buyer_id)
              .single();
            
            const { data: buyerData } = await supabase
              .from('buyers')
              .select('avatar_url')
              .eq('id', r.buyer_id)
              .single();
            
            if (profileData) {
              const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
              if (fullName) buyerName = fullName;
            }
            
            if (buyerData?.avatar_url) {
              buyerAvatar = buyerData.avatar_url;
            }
          } catch {
            // Use defaults
          }

          // Parse seller reply
          let reply = null;
          if (r.seller_reply) {
            reply = {
              message: r.seller_reply.message || r.seller_reply,
              date: new Date(r.seller_reply.replied_at || r.updated_at),
            };
          }

          return {
            ...r,
            productName: r.products?.name || 'Unknown Product',
            productImage: r.products?.image || null,
            buyerName,
            buyerAvatar,
            images: r.images || [],
            helpful: r.helpful_count || 0,
            date: new Date(r.created_at),
            verified: r.is_verified_purchase || false,
            reply,
          };
        })
      );
      
      setReviews(mappedReviews);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Failed to load reviews. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReviews(true);
  }, [user?.id]);

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (review.comment || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRating === 'all' || review.rating === filterRating;
    return matchesSearch && matchesFilter;
  });

  const reviewStats = {
    total: reviews.length,
    average: reviews.length > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0',
    fiveStar: reviews.filter((r) => r.rating === 5).length,
    fourStar: reviews.filter((r) => r.rating === 4).length,
    threeStar: reviews.filter((r) => r.rating === 3).length,
    needsReply: reviews.filter((r) => !r.seller_reply).length,
    withPhotos: reviews.filter((r) => (r.images || []).length > 0).length,
  };

  const handleReply = (review: ReviewWithDetails) => {
    setSelectedReview(review);
    setReplyText(review.seller_reply?.message || review.reply?.message || '');
    setShowReplyModal(true);
  };

  const submitReply = async () => {
    if (!selectedReview || !user?.id || !replyText.trim()) return;

    setIsSubmitting(true);

    try {
      await reviewService.addSellerReply(selectedReview.id, user.id, replyText.trim());
      
      // Reload reviews to get updated data
      await loadReviews(true);

      setShowReplyModal(false);
      setReplyText('');
      setSelectedReview(null);
      
      setSuccessMessage('Reply sent successfully!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error submitting reply:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to submit reply. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReply = async (review: ReviewWithDetails) => {
    if (!user?.id) return;

    Alert.alert(
      'Delete Reply',
      'Are you sure you want to delete your reply?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewService.deleteSellerReply(review.id, user.id);
              await loadReviews(true);
              
              setSuccessMessage('Reply deleted successfully!');
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            } catch (err) {
              console.error('Error deleting reply:', err);
              Alert.alert('Error', 'Failed to delete reply. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating: number, size: number = 14) => {
    return (
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={size}
            color={i < rating ? '#FBBF24' : '#E5E7EB'}
            fill={i < rating ? '#FBBF24' : '#E5E7EB'}
            strokeWidth={0}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Reviews & Ratings</Text>
          <TouchableOpacity onPress={() => loadReviews()} style={styles.headerIconButton}>
            <RefreshCw size={20} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5722']} />
        }
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Star size={20} color="#FBBF24" fill="#FBBF24" strokeWidth={0} />
            </View>
            <Text style={styles.statValue}>{reviewStats.average}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
            {renderStars(Math.round(parseFloat(reviewStats.average)), 12)}
            <Text style={styles.statSubtext}>({reviewStats.total} reviews)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <MessageSquare size={20} color="#3B82F6" strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{reviewStats.needsReply}</Text>
            <Text style={styles.statLabel}>Needs Reply</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Check size={20} color="#10B981" strokeWidth={2.5} />
            </View>
            <Text style={styles.statValue}>{reviewStats.withPhotos}</Text>
            <Text style={styles.statLabel}>With Photos</Text>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Search size={18} color="#9CA3AF" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reviews..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
            {['all', 5, 4, 3, 2, 1].map((rating) => (
              <Pressable
                key={rating}
                style={[styles.filterTab, filterRating === rating && styles.filterTabActive]}
                onPress={() => setFilterRating(rating as any)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filterRating === rating && styles.filterTabTextActive,
                  ]}
                >
                  {rating === 'all' ? 'All' : `${rating} ⭐`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={48} color="#9CA3AF" strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>No reviews found</Text>
              <Text style={styles.emptyText}>
                {searchQuery || filterRating !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Reviews will appear here when customers leave feedback'}
              </Text>
            </View>
          ) : (
            filteredReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                {/* Product Header */}
                <View style={styles.productHeader}>
                  <Image 
                    source={{ uri: safeImageUri(review.productImage, PLACEHOLDER_PRODUCT) }} 
                    style={styles.productImage} 
                  />
                  <Text style={styles.productName} numberOfLines={2}>
                    {review.productName}
                  </Text>
                </View>

                {/* Buyer Info */}
                <View style={styles.buyerSection}>
                  <Image 
                    source={{ uri: safeImageUri(review.buyerAvatar, PLACEHOLDER_AVATAR) }} 
                    style={styles.buyerAvatar} 
                  />
                  <View style={styles.buyerInfo}>
                    <View style={styles.buyerHeader}>
                      <Text style={styles.buyerName}>{review.buyerName}</Text>
                      {review.verified && (
                        <View style={styles.verifiedBadge}>
                          <Check size={10} color="#10B981" strokeWidth={3} />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.ratingDate}>
                      {renderStars(review.rating)}
                      <Text style={styles.reviewDate}>
                        {(review.date || new Date(review.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Review Content */}
                <Text style={styles.reviewComment}>{review.comment || 'No comment provided'}</Text>

                {/* Review Images */}
                {(review.images || []).length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.reviewImagesScroll}
                  >
                    {(review.images || []).map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.reviewImage} />
                    ))}
                  </ScrollView>
                )}

                {/* Helpful Count */}
                <View style={styles.helpfulSection}>
                  <ThumbsUp size={14} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.helpfulText}>{review.helpful} found this helpful</Text>
                </View>

                {/* Seller Reply */}
                {review.reply || review.seller_reply ? (
                  <View style={styles.replyContainer}>
                    <View style={styles.replyHeader}>
                      <Reply size={14} color="#FF5722" strokeWidth={2.5} />
                      <Text style={styles.replyLabel}>Seller Response</Text>
                      <Text style={styles.replyDate}>
                        {review.reply?.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={styles.replyText}>
                      {review.reply?.message || review.seller_reply?.message}
                    </Text>
                    <View style={styles.replyActions}>
                      <TouchableOpacity 
                        style={styles.replyActionButton}
                        onPress={() => handleReply(review)}
                      >
                        <Edit3 size={14} color="#FF5722" strokeWidth={2} />
                        <Text style={styles.replyActionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.replyActionButton}
                        onPress={() => handleDeleteReply(review)}
                      >
                        <Trash2 size={14} color="#EF4444" strokeWidth={2} />
                        <Text style={[styles.replyActionText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Pressable style={styles.replyButton} onPress={() => handleReply(review)}>
                    <Reply size={16} color="#FF5722" strokeWidth={2.5} />
                    <Text style={styles.replyButtonText}>Reply to Review</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Reply Modal */}
      <Modal
        visible={showReplyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReplyModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReplyModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>
                {selectedReview?.reply || selectedReview?.seller_reply ? 'Edit Reply' : 'Reply to Review'}
              </Text>
              
              {selectedReview && (
                <View style={styles.modalReviewPreview}>
                  <Text style={styles.modalReviewLabel}>Review from {selectedReview.buyerName}:</Text>
                  <Text style={styles.modalReviewText} numberOfLines={2}>
                    "{selectedReview.comment || 'No comment'}"
                  </Text>
                </View>
              )}

              <TextInput
                style={[styles.modalInput, { color: '#000' }]}
                placeholder="Type your response..."
                placeholderTextColor="#9CA3AF"
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus={true}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => setShowReplyModal(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalSubmitButton, (!replyText.trim() || isSubmitting) && { opacity: 0.7 }]} 
                  onPress={submitReply}
                  disabled={!replyText.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>
                      {selectedReview?.reply || selectedReview?.seller_reply ? 'Update Reply' : 'Send Reply'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Success Toast Notification */}
      {showSuccess && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Check size={20} color="#FFFFFF" strokeWidth={3} />
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
    backgroundColor: '#F5F5F7',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  errorContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  reviewsList: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  productName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  buyerSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  buyerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  buyerInfo: {
    flex: 1,
  },
  buyerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  ratingDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  reviewComment: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImagesScroll: {
    marginBottom: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F5F5F7',
  },
  helpfulSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  helpfulText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  replyContainer: {
    backgroundColor: '#FFF5F0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF5722',
  },
  replyDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  replyText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  replyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5722',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FF5722',
    borderRadius: 8,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5722',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalReviewPreview: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
