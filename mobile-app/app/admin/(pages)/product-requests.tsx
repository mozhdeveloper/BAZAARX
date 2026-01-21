import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { ArrowLeft, MessageSquare, Search, ThumbsUp, MessageCircle, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminProductRequests } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminProductRequestsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { requests, isLoading, loadRequests } = useAdminProductRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'in_progress'>('all');

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { bg: '#FEF3C7', color: '#D97706', text: 'Pending' },
      approved: { bg: '#D1FAE5', color: '#059669', text: 'Approved' },
      rejected: { bg: '#FEE2E2', color: '#DC2626', text: 'Rejected' },
      in_progress: { bg: '#DBEAFE', color: '#2563EB', text: 'In Progress' },
    }[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: config?.bg }]}>
        <Text style={[styles.statusText, { color: config?.color }]}>{config?.text}</Text>
      </View>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      high: { bg: '#FEE2E2', color: '#DC2626', text: 'High' },
      medium: { bg: '#FEF3C7', color: '#D97706', text: 'Medium' },
      low: { bg: '#E5E7EB', color: '#6B7280', text: 'Low' },
    }[priority];
    return (
      <View style={[styles.priorityBadge, { backgroundColor: config?.bg }]}>
        <Text style={[styles.priorityText, { color: config?.color }]}>{config?.text}</Text>
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
            <Text style={styles.headerTitle}>Product Requests</Text>
            <Text style={styles.headerSubtitle}>View and manage requests</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'pending', 'approved', 'in_progress', 'rejected'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, filterStatus === filter && styles.filterChipActive]}
              onPress={() => setFilterStatus(filter as any)}
            >
              <Text style={[styles.filterChipText, filterStatus === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.centerContent}>
            <MessageSquare size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No requests found</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.productName}>{request.productName}</Text>
                  <Text style={styles.category}>{request.category}</Text>
                </View>
                <View style={styles.badges}>
                  {getPriorityBadge(request.priority)}
                  {getStatusBadge(request.status)}
                </View>
              </View>
              <Text style={styles.description} numberOfLines={2}>{request.description}</Text>
              <View style={styles.requestFooter}>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <ThumbsUp size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{request.votes} votes</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MessageCircle size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{request.comments} comments</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <TrendingUp size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{request.estimatedDemand} demand</Text>
                  </View>
                </View>
                {request.adminNotes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Admin Notes:</Text>
                    <Text style={styles.notesText}>{request.adminNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: '#FF5722', paddingHorizontal: 20, paddingBottom: 20 },
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
  filterChipActive: { backgroundColor: '#FF5722' },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  requestCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  category: { fontSize: 13, color: '#6B7280' },
  badges: { gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  priorityText: { fontSize: 11, fontWeight: '600' },
  description: { fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 20 },
  requestFooter: { gap: 12 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },
  notesBox: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#FF5722' },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});
