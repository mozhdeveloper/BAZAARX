import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Menu, Bell, UserCheck, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { useAdminSellers } from '../../../src/stores/adminStore';
import AdminDrawer from '../../../src/components/AdminDrawer';

export default function AdminSellersScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState('');
  const insets = useSafeAreaInsets();
  
  const { sellers, pendingSellers, isLoading, loadSellers, approveSeller, rejectSeller } = useAdminSellers();

  // Reload sellers every time screen comes into focus (e.g., when switching accounts)
  useFocusEffect(
    useCallback(() => {
      loadSellers();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSellers();
    setRefreshing(false);
  };

  const handleApprove = async (sellerId: string) => {
    await approveSeller(sellerId);
  };

  const handleReject = async (sellerId: string) => {
    await rejectSeller(sellerId, 'Application rejected by admin');
  };

  const handleViewDetails = (seller: any) => {
    setSelectedSeller(seller);
    setDetailsModalVisible(true);
  }

  const filteredSellers = selectedTab === 'pending' 
    ? pendingSellers 
    : selectedTab === 'approved'
    ? sellers.filter(s => s.status === 'approved')
    : sellers;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Sellers</Text>
              <Text style={styles.headerSubtitle}>{pendingSellers.length} Pending</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={22} color="#FFFFFF" strokeWidth={2} />
            {pendingSellers.length > 0 && <View style={styles.notificationBadge} />}
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {[
            { key: 'pending', label: 'Pending', count: pendingSellers.length },
            { key: 'approved', label: 'Approved', count: sellers.filter(s => s.status === 'approved').length },
            { key: 'all', label: 'All', count: sellers.length },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, selectedTab === tab.key && styles.tabActive]}
              onPress={() => setSelectedTab(tab.key as any)}
            >
              <Text style={[styles.tabText, selectedTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, selectedTab === tab.key && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, selectedTab === tab.key && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5722']} />}
      >
        {isLoading && !refreshing ? (
          <ActivityIndicator size="large" color="#FF5722" style={{ marginTop: 40 }} />
        ) : filteredSellers.length === 0 ? (
          <View style={styles.emptyState}>
            <UserCheck size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No {selectedTab} sellers</Text>
            <Text style={styles.emptyText}>Seller applications will appear here</Text>
          </View>
        ) : (
          filteredSellers.map((seller) => (
            <View key={seller.id} style={styles.sellerCard}>
              <View style={styles.sellerHeader}>
                <View style={styles.sellerInfo}>
                  <View style={styles.sellerAvatar}>
                    <Text style={styles.sellerAvatarText}>
                      {seller.storeName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.sellerDetails}>
                    <Text style={styles.sellerName}>{seller.storeName}</Text>
                    <Text style={styles.sellerBusiness}>{seller.businessName}</Text>
                    <Text style={styles.sellerEmail}>{seller.email}</Text>
                  </View>
                </View>
                <View style={[
                  styles.statusBadge,
                  seller.status === 'approved' && styles.statusBadgeApproved,
                  seller.status === 'pending' && styles.statusBadgePending,
                  seller.status === 'rejected' && styles.statusBadgeRejected,
                ]}>
                  <Text style={[
                    styles.statusText,
                    seller.status === 'approved' && styles.statusTextApproved,
                    seller.status === 'pending' && styles.statusTextPending,
                    seller.status === 'rejected' && styles.statusTextRejected,
                  ]}>
                    {seller.status}
                  </Text>
                </View>
              </View>

              {seller.status === 'pending' && (
                <View style={styles.sellerActions}>
                  <Pressable
                    style={styles.approveButton}
                    onPress={() => handleApprove(seller.id)}
                  >
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={styles.rejectButton}
                    onPress={() => handleReject(seller.id)}
                  >
                    <XCircle size={18} color="#FFFFFF" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <AdminDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerTitleContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
    fontWeight: '500',
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF5722',
  },
  tabs: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FF5722',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  sellerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sellerInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  sellerBusiness: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  sellerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    height: 24,
  },
  statusBadgeApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusTextApproved: {
    color: '#065F46',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextRejected: {
    color: '#991B1B',
  },
  sellerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
