import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Image } from 'react-native';
import { ArrowLeft, Star, Search, CheckCircle, XCircle, Flag, ThumbsUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminReviews } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';

export default function AdminReviewsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { reviews, isLoading, loadReviews, approveReview, rejectReview } = useAdminReviews();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'flagged' | 'rejected'>('all');

  useEffect(() => {
    loadReviews();
  }, []);

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.buyerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : review.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: '#FEF3C7', color: '#D97706', text: 'Pending' },
      approved: { bg: '#D1FAE5', color: '#059669', text: 'Approved' },
      rejected: { bg: '#FEE2E2', color: '#DC2626', text: 'Rejected' },
      flagged: { bg: '#FED7AA', color: '#EA580C', text: 'Flagged' },
    }[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: config?.bg }]}>
        <Text style={[styles.statusText, { color: config?.color }]}>{config?.text}</Text>
      </View>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            fill={star <= rating ? '#FBBF24' : 'transparent'}
            color={star <= rating ? '#FBBF24' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Review Moderation</Text>
            <Text style={styles.headerSubtitle}>Moderate product reviews</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reviews..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'pending', 'flagged', 'approved', 'rejected'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, filterStatus === filter && styles.filterChipActive]}
              onPress={() => setFilterStatus(filter as any)}
            >
              <Text style={[styles.filterChipText, filterStatus === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : filteredReviews.length === 0 ? (
          <View style={styles.centerContent}>
            <Star size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No reviews found</Text>
          </View>
        ) : (
          filteredReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: review.productImage }} style={styles.productImage} />
                <View style={styles.headerInfo}>
                  <Text style={styles.productName}>{review.productName}</Text>
                  <Text style={styles.buyerName}>{review.buyerName}</Text>
                  {renderStars(review.rating)}
                </View>
                {getStatusBadge(review.status)}
              </View>
              <Text style={styles.reviewTitle}>{review.title}</Text>
              <Text style={styles.reviewContent} numberOfLines={3}>{review.content}</Text>
              <View style={styles.metaRow}>
                {review.isVerifiedPurchase && (
                  <View style={styles.verifiedBadge}>
                    <CheckCircle size={12} color="#059669" />
                    <Text style={styles.verifiedText}>Verified Purchase</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <ThumbsUp size={12} color="#6B7280" />
                  <Text style={styles.metaText}>{review.helpfulCount} helpful</Text>
                </View>
                {review.reportCount > 0 && (
                  <View style={styles.metaItem}>
                    <Flag size={12} color="#DC2626" />
                    <Text style={[styles.metaText, { color: '#DC2626' }]}>{review.reportCount} reports</Text>
                  </View>
                )}
              </View>
              {review.status === 'pending' && (
                <View style={styles.actions}>
                  <Pressable style={styles.approveButton} onPress={() => approveReview(review.id)}>
                    <CheckCircle size={16} color="#FFFFFF" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable style={styles.rejectButton} onPress={() => rejectReview(review.id, 'Manual rejection')}>
                    <XCircle size={16} color="#DC2626" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  filtersContainer: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  filterScrollView: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 8 },
  headerInfo: { flex: 1, gap: 4 },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  buyerName: { fontSize: 13, color: '#6B7280' },
  starsRow: { flexDirection: 'row', gap: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  reviewTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  reviewContent: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 8 },
  approveButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  rejectButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#DC2626', paddingVertical: 10, borderRadius: 8 },
  rejectButtonText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
});
