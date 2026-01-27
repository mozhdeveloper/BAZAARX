import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import {
  ArrowLeft,
  Star,
  MessageSquare,
  ThumbsUp,
  Search,
  Reply,
  Flag,
  Check,
} from 'lucide-react-native';

interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  comment: string;
  images: string[];
  helpful: number;
  date: Date;
  verified: boolean;
  reply: { message: string; date: Date } | null;
}

export default function ReviewsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<'all' | number>('all');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Mock Reviews Data matching web
  const mockReviews: Review[] = [
    {
      id: 'r1',
      productId: 'p1',
      productName: 'Premium Wireless Earbuds - Noise Cancelling',
      productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
      buyerName: 'Maria Santos',
      buyerAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop',
      rating: 5,
      comment: 'Excellent product! Sound quality is amazing and battery life lasts the whole day. Highly recommended!',
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop',
        'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=300&h=300&fit=crop',
      ],
      helpful: 24,
      date: new Date('2024-12-10'),
      verified: true,
      reply: null,
    },
    {
      id: 'r2',
      productId: 'p2',
      productName: 'Smart Watch Fitness Tracker',
      productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop',
      buyerName: 'Juan dela Cruz',
      buyerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
      rating: 4,
      comment: 'Great fitness tracker for the price. The only downside is the battery drains faster than expected when GPS is on.',
      images: [],
      helpful: 15,
      date: new Date('2024-12-12'),
      verified: true,
      reply: {
        message: 'Thank you for your feedback! We recommend turning off GPS when not actively tracking workouts to extend battery life. Feel free to reach out if you need any assistance.',
        date: new Date('2024-12-13'),
      },
    },
    {
      id: 'r3',
      productId: 'p1',
      productName: 'Premium Wireless Earbuds - Noise Cancelling',
      productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=100&h=100&fit=crop',
      buyerName: 'Ana Reyes',
      buyerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
      rating: 5,
      comment: 'Best purchase this year! Noise cancellation is perfect for my daily commute. Worth every peso!',
      images: ['https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=300&h=300&fit=crop'],
      helpful: 31,
      date: new Date('2024-12-14'),
      verified: true,
      reply: null,
    },
    {
      id: 'r4',
      productId: 'p3',
      productName: 'Portable Power Bank 20000mAh',
      productImage: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=100&h=100&fit=crop',
      buyerName: 'Carlo Rodriguez',
      buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
      rating: 3,
      comment: 'Product arrived late and packaging was slightly damaged. Power bank works fine though.',
      images: [],
      helpful: 8,
      date: new Date('2024-12-11'),
      verified: true,
      reply: null,
    },
    {
      id: 'r5',
      productId: 'p2',
      productName: 'Smart Watch Fitness Tracker',
      productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop',
      buyerName: 'Sofia Garcia',
      buyerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop',
      rating: 5,
      comment: 'Amazing smartwatch! Tracks all my workouts accurately. The heart rate monitor is very precise.',
      images: [],
      helpful: 19,
      date: new Date('2024-12-15'),
      verified: true,
      reply: null,
    },
  ];

  const [allReviews, setAllReviews] = useState<Review[]>(mockReviews);
  const filteredReviews = allReviews.filter((review) => {
    const matchesSearch =
      review.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRating === 'all' || review.rating === filterRating;
    return matchesSearch && matchesFilter;
  });

  const reviewStats = {
    total: allReviews.length,
    average: (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1),
    fiveStar: mockReviews.filter((r) => r.rating === 5).length,
    fourStar: mockReviews.filter((r) => r.rating === 4).length,
    threeStar: mockReviews.filter((r) => r.rating === 3).length,
    needsReply: mockReviews.filter((r) => !r.reply).length,
    withPhotos: mockReviews.filter((r) => r.images.length > 0).length,
  };

  const handleReply = (reviewId: string) => {
    setSelectedReview(reviewId);
    setShowReplyModal(true);
  };

  const submitReply = () => {
    if (!selectedReview || !replyText.trim()) return;

    setIsSubmitting(true);

    // Simulate a network request delay
    setTimeout(() => {
      setAllReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === selectedReview 
            ? { 
                ...review, 
                reply: { message: replyText, date: new Date() } 
              } 
            : review
        )
      );

      setIsSubmitting(false);
      setShowReplyModal(false);
      setReplyText('');
      setSelectedReview(null);
      
      // Show success toast
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
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

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Reviews & Ratings</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
          {filteredReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              {/* Product Header */}
              <View style={styles.productHeader}>
                <Image source={{ uri: review.productImage }} style={styles.productImage} />
                <Text style={styles.productName} numberOfLines={2}>
                  {review.productName}
                </Text>
              </View>

              {/* Buyer Info */}
              <View style={styles.buyerSection}>
                <Image source={{ uri: review.buyerAvatar }} style={styles.buyerAvatar} />
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
                      {review.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Review Content */}
              <Text style={styles.reviewComment}>{review.comment}</Text>

              {/* Review Images */}
              {review.images.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.reviewImagesScroll}
                >
                  {review.images.map((img, idx) => (
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
              {review.reply ? (
                <View style={styles.replyContainer}>
                  <View style={styles.replyHeader}>
                    <Reply size={14} color="#FF5722" strokeWidth={2.5} />
                    <Text style={styles.replyLabel}>Seller Response</Text>
                  </View>
                  <Text style={styles.replyText}>{review.reply.message}</Text>
                </View>
              ) : (
                <Pressable style={styles.replyButton} onPress={() => handleReply(review.id)}>
                  <Reply size={16} color="#FF5722" strokeWidth={2.5} />
                  <Text style={styles.replyButtonText}>Reply to Review</Text>
                </Pressable>
              )}
            </View>
          ))}
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
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Reply to Review</Text>
            <TextInput
              style={styles.modalInput}
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
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalSubmitButton, isSubmitting && { opacity: 0.7 }]} 
                onPress={submitReply}
                disabled={isSubmitting}
              >
                <Text style={styles.modalSubmitText}>
                  {isSubmitting ? 'Sending...' : 'Send Reply'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Toast Notification */}
      {showSuccess && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <Check size={20} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.toastText}>Reply sent successfully!</Text>
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
  replyText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
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
    backgroundColor: '#10B981', // Success Green
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
