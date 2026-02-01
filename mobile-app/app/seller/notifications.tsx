import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Search,
  Check,
  Filter,
  Menu,
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { notificationService, type Notification } from '../../src/services/notificationService';
import SellerDrawer from '../../src/components/SellerDrawer';

function getNotificationIcon(type: string) {
  if (type === 'seller_new_order') return <ShoppingBag size={20} color="#16a34a" />;
  if (type.includes('confirmed')) return <CheckCircle size={20} color="#2563eb" />;
  if (type.includes('shipped')) return <Truck size={20} color="#ea580c" />;
  if (type.includes('delivered')) return <Package size={20} color="#16a34a" />;
  if (type.includes('cancelled')) return <XCircle size={20} color="#dc2626" />;
  if (type.includes('return')) return <Package size={20} color="#ca8a04" />;
  return <Bell size={20} color="#6b7280" />;
}

function getNotificationBgColor(type: string, isRead: boolean) {
  if (isRead) return '#F9FAFB';
  if (type === 'seller_new_order') return '#F0FDF4';
  if (type.includes('confirmed')) return '#EFF6FF';
  if (type.includes('shipped')) return '#FFF7ED';
  if (type.includes('delivered')) return '#F0FDF4';
  if (type.includes('cancelled')) return '#FEF2F2';
  if (type.includes('return')) return '#FEFCE8';
  return '#F3F4F6';
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
}

export default function SellerNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { seller } = useSellerStore();
  
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!seller?.id) return;
    try {
      const data = await notificationService.getNotifications(seller.id, 'seller', 100);
      setNotifications(data);
    } catch (error) {
      console.error('[SellerNotifications] Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [seller?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !n.title.toLowerCase().includes(query) &&
          !n.message.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (filterStatus === 'unread' && n.is_read) return false;
      if (filterStatus === 'read' && !n.is_read) return false;

      return true;
    });
  }, [notifications, searchQuery, filterStatus]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    if (!seller?.id) return;
    await notificationService.markAllAsRead(seller.id, 'seller');
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
  };

  const handleNotificationPress = async (n: Notification) => {
    // Mark as read
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }

    // Navigate to orders if it's an order notification
    if (n.action_data?.orderId || n.type.includes('order')) {
      router.push('/seller/(tabs)/orders');
    }
  };

  return (
    <View style={styles.container}>
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Immersive Edge-to-Edge Header */}
      <LinearGradient
        colors={['#FF5722', '#FF7043']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          {/* Left Section: Menu & Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              style={styles.iconContainer}
              onPress={() => setDrawerVisible(true)}
              hitSlop={8}
            >
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle}>Stay updated on your store activity</Text>
            </View>
          </View>
        </View>

        {/* Mark All Read Button */}
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.markAllText}>Mark All Read</Text>
          </Pressable>
        )}
      </LinearGradient>

      {/* Search & Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
        >
          <Filter size={18} color={showFilters ? '#FF5722' : '#6B7280'} />
        </Pressable>
      </View>

      {/* Filter Pills */}
      {showFilters && (
        <View style={styles.filterPills}>
          {(['all', 'unread', 'read'] as const).map((status) => (
            <Pressable
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[
                styles.filterPill,
                filterStatus === status && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterStatus === status && styles.filterPillTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterStatus !== 'all'
                ? 'No notifications match your filters'
                : "You're all caught up!"}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: getNotificationBgColor(
                    notification.type,
                    notification.is_read
                  ),
                },
              ]}
            >
              <View style={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !notification.is_read && styles.notificationTitleUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimeAgo(notification.created_at)}
                  </Text>
                </View>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                {(notification.priority === 'high' ||
                  notification.priority === 'urgent') && (
                  <View
                    style={[
                      styles.priorityBadge,
                      notification.priority === 'urgent'
                        ? styles.priorityUrgent
                        : styles.priorityHigh,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        notification.priority === 'urgent'
                          ? styles.priorityTextUrgent
                          : styles.priorityTextHigh,
                      ]}
                    >
                      {notification.priority === 'urgent' ? 'Urgent' : 'High Priority'}
                    </Text>
                  </View>
                )}
              </View>
              {!notification.is_read && <View style={styles.unreadDot} />}
            </Pressable>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Summary */}
      {notifications.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </Text>
        </View>
      )}

      {/* Drawer */}
      <SellerDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
    marginTop: 2,
  },
  headerBadge: {
    marginLeft: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  markAllText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  filterButton: {
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  filterButtonActive: {
    backgroundColor: '#FFF7ED',
  },
  filterPills: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: '#FF5722',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  notificationTitleUnread: {
    fontWeight: '700',
    color: '#111827',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityHigh: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FB923C',
  },
  priorityUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityTextHigh: {
    color: '#EA580C',
  },
  priorityTextUrgent: {
    color: '#DC2626',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5722',
    marginLeft: 8,
  },
  summaryContainer: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
