import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MessageSquare, Clock, CircleCheck, CircleAlert, Circle } from 'lucide-react-native';
import { COLORS } from '../../../src/constants/theme';
import { TicketService } from '../../../services/TicketService';
import type { Ticket, TicketStatus } from '../../types/ticketTypes';

type Props = {
  navigation: any;
};

const STATUS_FILTERS: Array<{ label: string; value: TicketStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Waiting', value: 'waiting_response' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'open': return '#3B82F6';
    case 'in_progress': return '#F59E0B';
    case 'waiting_response': return '#8B5CF6';
    case 'resolved': return '#10B981';
    case 'closed': return '#6B7280';
    default: return '#6B7280';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return '#DC2626';
    case 'high': return '#F97316';
    case 'normal': return '#3B82F6';
    case 'low': return '#9CA3AF';
    default: return '#9CA3AF';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminSupportScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      const data = await TicketService.getAllTickets();
      setTickets(data);
    } catch (err) {
      console.error('Error loading admin tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  }, [loadTickets]);

  const filtered = tickets.filter((t) => {
    const matchStatus = activeFilter === 'all' || t.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.subject.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.categoryName || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading tickets…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1F2937" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Support Tickets</Text>
          <Text style={styles.headerSub}>
            {openCount} open · {inProgressCount} in progress
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', count: tickets.length, color: '#1F2937' },
          { label: 'Open', count: openCount, color: '#3B82F6' },
          { label: 'In Progress', count: inProgressCount, color: '#F59E0B' },
          {
            label: 'Resolved',
            count: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
            color: '#10B981',
          },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[
              styles.filterChip,
              activeFilter === f.value && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === f.value && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Ticket List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <MessageSquare size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No tickets found</Text>
          </View>
        ) : (
          filtered.map((ticket) => (
            <Pressable
              key={ticket.id}
              style={({ pressed }) => [styles.ticketCard, pressed && styles.ticketCardPressed]}
              onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: ticket.id })}
            >
              <View style={styles.ticketTop}>
                <View style={styles.ticketMeta}>
                  <Text style={styles.ticketId}>#{ticket.id.substring(0, 8).toUpperCase()}</Text>
                  <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(ticket.priority) }]} />
                  <Text style={[styles.priorityLabel, { color: getPriorityColor(ticket.priority) }]}>
                    {ticket.priority.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                  <Text style={styles.statusText}>{ticket.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>

              <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
              <Text style={styles.ticketDesc} numberOfLines={2}>{ticket.description}</Text>

              <View style={styles.ticketFooter}>
                <View style={styles.footerLeft}>
                  <MessageSquare size={13} color="#9CA3AF" />
                  <Text style={styles.footerText}>{ticket.messages.length} messages</Text>
                  {ticket.categoryName && (
                    <>
                      <Text style={styles.footerDot}>·</Text>
                      <Text style={styles.footerText}>{ticket.categoryName}</Text>
                    </>
                  )}
                </View>
                <Text style={styles.timeAgo}>{timeAgo(ticket.updatedAt)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statCount: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  filterTextActive: { color: '#FFF' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketCardPressed: { opacity: 0.85 },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketId: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityLabel: { fontSize: 10, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 10, fontWeight: '700', color: '#FFF', textTransform: 'capitalize' },
  ticketSubject: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  ticketDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#9CA3AF' },
  footerDot: { fontSize: 12, color: '#D1D5DB' },
  timeAgo: { fontSize: 11, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
