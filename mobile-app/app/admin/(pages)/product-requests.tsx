import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput, Alert } from 'react-native';
import { ArrowLeft, MessageSquare, Search, ThumbsUp, TrendingUp, CheckCircle, XCircle, Clock, Eye } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminProductRequests } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';

// All Epic 7 canonical + legacy statuses
const STATUS_CONFIG: Record<string, { bg: string; color: string; text: string }> = {
  new:                   { bg: '#F3F4F6', color: '#374151', text: 'New' },
  under_review:          { bg: '#DBEAFE', color: '#1E40AF', text: 'Under Review' },
  approved_for_sourcing: { bg: '#EDE9FE', color: '#6D28D9', text: 'Sourcing' },
  already_available:     { bg: '#D1FAE5', color: '#065F46', text: 'Available' },
  on_hold:               { bg: '#FEF3C7', color: '#92400E', text: 'On Hold' },
  converted_to_listing:  { bg: '#D1FAE5', color: '#065F46', text: 'Listed 🎉' },
  // legacy
  pending:               { bg: '#FEF3C7', color: '#D97706', text: 'Gathering' },
  approved:              { bg: '#D1FAE5', color: '#059669', text: 'Approved' },
  rejected:              { bg: '#FEE2E2', color: '#DC2626', text: 'Rejected' },
  in_progress:           { bg: '#DBEAFE', color: '#2563EB', text: 'Sourcing' },
};

const FILTER_OPTIONS = [
  { key: 'all',                   label: 'All' },
  { key: 'new',                   label: 'New' },
  { key: 'under_review',          label: 'Under Review' },
  { key: 'approved_for_sourcing', label: 'Sourcing' },
  { key: 'already_available',     label: 'Available' },
  { key: 'on_hold',               label: 'On Hold' },
  { key: 'converted_to_listing',  label: 'Listed' },
  { key: 'rejected',              label: 'Rejected' },
];

export default function AdminProductRequestsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { requests, isLoading, loadRequests, updateStatus, deleteRequest } = useAdminProductRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadRequests(); }, []);

  const filteredRequests = useMemo(() => requests.filter(request => {
    const matchesSearch =
      request.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  }), [requests, searchQuery, filterStatus]);

  const handleAction = (id: string, action: 'approve' | 'reject' | 'hold' | 'review') => {
    const STATUS_MAP = {
      approve: 'approved_for_sourcing' as const,
      review:  'under_review' as const,
      hold:    'on_hold' as const,
      reject:  'rejected' as const,
    };
    const requiresReason = action === 'reject' || action === 'hold';
    if (requiresReason) {
      Alert.alert(
        action === 'reject' ? 'Reject Request' : 'Hold Request',
        'Enter a reason (required):',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: action === 'reject' ? 'destructive' : 'default',
            onPress: () => {
              // Cross-platform: prompt not available on Android — use generic reason
              Alert.prompt?.(
                'Reason',
                `Why are you ${action === 'reject' ? 'rejecting' : 'holding'} this request?`,
                (reason: string) => {
                  if (reason?.trim()) updateStatus(id, STATUS_MAP[action], reason.trim());
                },
                'plain-text'
              ) ?? updateStatus(id, STATUS_MAP[action], `${action === 'reject' ? 'Rejected' : 'On hold'} by admin`);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Confirm Action',
        `Move this request to "${STATUS_MAP[action].replace(/_/g, ' ')}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => updateStatus(id, STATUS_MAP[action]) },
        ]
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
    return (
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.text}</Text>
      </View>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, any> = {
      high:   { bg: '#FEE2E2', color: '#DC2626', text: 'High' },
      medium: { bg: '#FEF3C7', color: '#D97706', text: 'Medium' },
      low:    { bg: '#E5E7EB', color: '#6B7280', text: 'Low' },
    };
    const cfg = config[priority] ?? config.medium;
    return (
      <View style={[styles.priorityBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.priorityText, { color: cfg.color }]}>{cfg.text}</Text>
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
          {FILTER_OPTIONS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]}
              onPress={() => setFilterStatus(f.key)}
            >
              <Text style={[styles.filterChipText, filterStatus === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
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
                  <Text style={styles.category}>{request.category} · {request.requestedBy}</Text>
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
                    <TrendingUp size={14} color="#6B7280" />
                    <Text style={styles.metaText}>{request.demandCount} demand</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaText, { color: '#F59E0B' }]}>⚡ {request.stakedBazcoins} BC</Text>
                  </View>
                </View>
                {!!(request.adminNotes || request.rejectionHoldReason) && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Admin Note:</Text>
                    <Text style={styles.notesText}>{request.rejectionHoldReason || request.adminNotes}</Text>
                  </View>
                )}
                {/* BX-07-029: Admin action buttons */}
                {request.status !== 'converted_to_listing' && request.status !== 'already_available' && (
                  <View style={styles.actionRow}>
                    {request.status !== 'under_review' && (
                      <Pressable style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => handleAction(request.id, 'review')}>
                        <Eye size={12} color="#1E40AF" />
                        <Text style={[styles.actionBtnText, { color: '#1E40AF' }]}>Review</Text>
                      </Pressable>
                    )}
                    {request.status !== 'approved_for_sourcing' && request.status !== 'rejected' && (
                      <Pressable style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleAction(request.id, 'approve')}>
                        <CheckCircle size={12} color="#065F46" />
                        <Text style={[styles.actionBtnText, { color: '#065F46' }]}>Approve</Text>
                      </Pressable>
                    )}
                    {request.status !== 'on_hold' && request.status !== 'rejected' && (
                      <Pressable style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleAction(request.id, 'hold')}>
                        <Clock size={12} color="#92400E" />
                        <Text style={[styles.actionBtnText, { color: '#92400E' }]}>Hold</Text>
                      </Pressable>
                    )}
                    {request.status !== 'rejected' && (
                      <Pressable style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleAction(request.id, 'reject')}>
                        <XCircle size={12} color="#DC2626" />
                        <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
                      </Pressable>
                    )}
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
  notesBox: { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  notesLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { fontSize: 11, fontWeight: '700' },
});
