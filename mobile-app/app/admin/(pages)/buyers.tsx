import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput } from 'react-native';
import { ArrowLeft, Users, Search, ShoppingBag, DollarSign, CheckCircle, Ban, UserX, Phone, Mail, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminBuyers } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminBuyersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { buyers, isLoading, loadBuyers } = useAdminBuyers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');

  useEffect(() => {
    loadBuyers();
  }, []);

  const filteredBuyers = buyers.filter(buyer => {
    const matchesSearch = buyer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buyer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buyer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || buyer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      active: { bg: '#D1FAE5', color: '#059669', text: 'Active', Icon: CheckCircle },
      suspended: { bg: '#FED7AA', color: '#EA580C', text: 'Suspended', Icon: Ban },
      banned: { bg: '#FEE2E2', color: '#DC2626', text: 'Banned', Icon: UserX },
    }[status as 'active' | 'suspended' | 'banned'];
    
    if (!config) return null;
    const Icon = config.Icon;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Icon size={12} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Buyer Management</Text>
            <Text style={styles.headerSubtitle}>View and manage buyers</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search buyers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'active', 'suspended', 'banned'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter as any)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading buyers...</Text>
          </View>
        ) : filteredBuyers.length === 0 ? (
          <View style={styles.centerContent}>
            <Users size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No buyers found</Text>
          </View>
        ) : (
          filteredBuyers.map((buyer) => (
            <View key={buyer.id} style={styles.buyerCard}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: buyer.avatar }} style={styles.avatar} />
                <View style={styles.headerInfo}>
                  <Text style={styles.buyerName}>{buyer.firstName} {buyer.lastName}</Text>
                  <View style={styles.contactRow}>
                    <Mail size={12} color="#6B7280" />
                    <Text style={styles.contactText}>{buyer.email}</Text>
                  </View>
                  {buyer.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={12} color="#6B7280" />
                      <Text style={styles.contactText}>{buyer.phone}</Text>
                    </View>
                  )}
                </View>
                {getStatusBadge(buyer.status)}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <ShoppingBag size={16} color="#FF5722" />
                  </View>
                  <Text style={styles.statValue}>{buyer.metrics.totalOrders}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <View style={styles.statIconContainer}>
                    <DollarSign size={16} color="#FF5722" />
                  </View>
                  <Text style={styles.statValue}>₱{(buyer.metrics.totalSpent / 1000).toFixed(1)}k</Text>
                  <Text style={styles.statLabel}>Spent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{buyer.metrics.loyaltyPoints}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>

              {buyer.addresses && buyer.addresses.length > 0 && (
                <View style={styles.addressContainer}>
                  <View style={styles.addressRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {buyer.addresses[0].city}, {buyer.addresses[0].province}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Joined {formatDate(buyer.joinDate)}</Text>
                <Text style={styles.footerText}>Last active {formatDate(buyer.lastActivity)}</Text>
              </View>

              {buyer.suspensionReason && (
                <View style={styles.suspensionBox}>
                  <Text style={styles.suspensionLabel}>Suspension Reason:</Text>
                  <Text style={styles.suspensionText}>{buyer.suspensionReason}</Text>
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
  buyerCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  headerInfo: { flex: 1, gap: 4 },
  buyerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontSize: 12, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statIconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF5F0', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  addressContainer: { paddingTop: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { fontSize: 13, color: '#374151', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  footerText: { fontSize: 11, color: '#9CA3AF' },
  suspensionBox: { marginTop: 12, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#D97706' },
  suspensionLabel: { fontSize: 11, fontWeight: '600', color: '#92400E', marginBottom: 2 },
  suspensionText: { fontSize: 12, color: '#78350F' },
});
