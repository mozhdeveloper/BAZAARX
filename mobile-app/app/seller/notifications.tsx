import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  Search,
  Check,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
  ShoppingBag,
  XCircle,
  CheckCircle,
  RotateCcw,
  MessageSquare,
  Package,
  Star,
  Truck,
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { notificationService, type Notification } from '../../src/services/notificationService';
import SellerDrawer from '../../src/components/SellerDrawer';

const getNotificationStyles = (type: string) => {
  const t = type.toLowerCase();
  // Check for more specific patterns first before general patterns
  if (t.includes('product_rejected')) {
    return { Icon: XCircle, color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
  }
  if (t.includes('product_approved')) {
    return { Icon: CheckCircle, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' };
  }
  if (t.includes('product_sample_request') || t.includes('sample')) {
    return { Icon: Package, color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' };
  }
  if (t.includes('cancelled') || t.includes('cancellation')) {
    return { Icon: XCircle, color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
  }
  if (t.includes('shipped') || t.includes('delivered')) {
    return { Icon: Truck, color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' };
  }
  if (t.includes('received') || t.includes('confirmed')) {
    return { Icon: CheckCircle, color: '#16A34A', bg: '#F0FDF4', border: '#DCFCE7' };
  }
  if (t.includes('new_order') || t.includes('order')) {
    return { Icon: ShoppingBag, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' };
  }
  if (t.includes('return')) {
    return { Icon: RotateCcw, color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' };
  }
  if (t.includes('message')) {
    return { Icon: MessageSquare, color: '#7C3AED', bg: '#EDE9FE', border: '#DDD6FE' };
  }
  if (t.includes('product') || t.includes('verification')) {
    return { Icon: Package, color: '#4F46E5', bg: '#E0E7FF', border: '#C7D2FE' };
  }
  if (t.includes('review')) {
    return { Icon: Star, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
  }
  return { Icon: Bell, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };
};

const SelectionModal = ({ visible, onClose, options, current, onSelect, title }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>{title}</Text>
        {options.map((opt: string) => (
          <Pressable key={opt} style={styles.optionItem} onPress={() => onSelect(opt)}>
            <Text style={[styles.optionText, current === opt && styles.optionTextActive]}>
              {opt.toUpperCase()}
            </Text>
            {current === opt && <Check size={18} color="#D97706" />}
          </Pressable>
        ))}
      </View>
    </Pressable>
  </Modal>
);

export default function SellerNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { seller } = useSellerStore();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubRealRef = React.useRef<(() => void) | null>(null);
  const mountedRef = React.useRef(true);

  const [filterType, setFilterType] = useState('All Types');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!seller?.id) return;
    try {
      const data = await notificationService.getNotifications(seller.id, 'seller', 100);
      if (mountedRef.current) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('[Notifications] Error fetching:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [seller?.id]);

  const upsertNotificationInState = useCallback((newNotification: Notification) => {
    console.log('[SellerNotifications] Upserting notification in state:', newNotification);
    if (!mountedRef.current) return;

    setLoading(false);
    setNotifications(prev => {
      const existingIndex = prev.findIndex((n) => n.id === newNotification.id);

      if (existingIndex >= 0) {
        return prev.map((item) => item.id === newNotification.id ? { ...item, ...newNotification } : item);
      }

      return [newNotification, ...prev];
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();

    // Real-time subscription for live seller notification updates - instantly add to UI
    if (seller?.id && !unsubRealRef.current) {
      unsubRealRef.current = notificationService.subscribeToNotifications(
        seller.id,
        'seller',
        (newNotification) => {
          console.log('[SellerNotifications] New notification via real-time:', newNotification);
          upsertNotificationInState(newNotification);
        }
      );
    }

    // Cleanup old polling interval if it exists
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Faster fallback polling every 10 seconds as safety net for missed real-time events
    pollIntervalRef.current = setInterval(() => {
      if (seller?.id && mountedRef.current) {
        void fetchNotifications();
      }
    }, 10000);

    return () => {
      mountedRef.current = false;
      if (unsubRealRef.current) {
        unsubRealRef.current();
        unsubRealRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchNotifications, seller?.id, upsertNotificationInState]);

  const handleMarkAllAsRead = async () => {
    if (!seller?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await notificationService.markAllAsRead(seller.id, 'seller');
  };

  const handlePress = useCallback(async (n: Notification) => {
    if (!n.is_read) {
      // Optimistic update: card only marks as read when tapped
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      await notificationService.markAsRead(n.id, 'seller');
    }
    if (n.type.includes('order')) {
      (navigation as any).navigate('SellerOrderDetail', { orderId: n.action_data?.orderId });
    } else if (n.type.includes('return')) {
      const returnId = (n.action_data as any)?.returnId;
      if (returnId) {
        (navigation as any).navigate('ReturnDetail', { returnId });
      } else {
        (navigation as any).navigate('SellerOrderDetail', { orderId: (n.action_data as any)?.orderId });
      }
    } else if (n.type.includes('message')) {
      (navigation as any).navigate('Messages');
    } else if (n.type === 'seller_new_review' || n.type.includes('review')) {
      (navigation as any).navigate('Reviews');
    }
  }, [navigation]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch = !searchQuery || [n.title, n.message].some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'All' || (filterStatus === 'Unread' ? !n.is_read : n.is_read);
      const matchesType = filterType === 'All Types'
        || (filterType === 'Orders' && n.type.includes('order'))
        || (filterType === 'Returns' && n.type.includes('return'))
        || (filterType === 'Messages' && n.type.includes('message'))
        || (filterType === 'System' && n.type.includes('system'));
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [notifications, searchQuery, filterStatus, filterType]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handlePress(item)}
      style={({ pressed }) => [
        styles.notificationCard,
        item.is_read ? styles.readCard : styles.unreadCard,
        pressed && styles.cardPressed
      ]}
    >
      {(() => {
        const { Icon, color, bg, border } = getNotificationStyles(item.type);
        return (
          <View style={[styles.notificationIcon, { backgroundColor: bg, borderWidth: 1, borderColor: border }]}>
            <Icon size={20} color={item.is_read ? '#9CA3AF' : color} />
          </View>
        );
      })()}
      <View style={styles.notificationContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.boldText]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.timeText}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </Pressable>
  ), [handlePress]);

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Header with restored Subtitle */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconContainer} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#1F2937" />
            </Pressable>
            <View style={styles.titleContainer}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.titleBadge}>
                    <Text style={styles.badgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <Text style={styles.headerSubtitle}>Stay updated with your store activity</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable style={styles.dropdown} onPress={() => setShowTypeMenu(true)}>
          <Text style={styles.dropdownText}>{filterType}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </Pressable>
        <Pressable style={styles.dropdown} onPress={() => setShowStatusMenu(true)}>
          <Text style={styles.dropdownText}>{filterStatus}</Text>
          <ChevronDown size={16} color="#6B7280" />
        </Pressable>
        <Pressable style={styles.markAllBtn} onPress={handleMarkAllAsRead}>
          <Check size={16} color="#374151" />
          <Text style={styles.markAllText}>Mark All as Read</Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 40 }} /> : <Text style={styles.emptyText}>No notifications yet.</Text>}
      />

      {/* Sticky Footer Summary */}
      {notifications.length > 0 && (
        <View style={[styles.summaryContainer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.summaryText}>
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </Text>
        </View>
      )}

      <SelectionModal visible={showTypeMenu} onClose={() => setShowTypeMenu(false)} title="Select Type" options={['All Types', 'Orders', 'Returns', 'Messages', 'System']} current={filterType} onSelect={(val: string) => { setFilterType(val); setShowTypeMenu(false); }} />
      <SelectionModal visible={showStatusMenu} onClose={() => setShowStatusMenu(false)} title="Select Status" options={['All', 'Unread', 'Read']} current={filterStatus} onSelect={(val: string) => { setFilterStatus(val); setShowStatusMenu(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#FFF4EC', paddingHorizontal: 20, paddingBottom: 10,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 20, elevation: 3 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12 },
  titleContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  titleBadge: { backgroundColor: '#D97706', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, color: '#4B5563', fontWeight: '500', marginTop: 4 },
  searchSection: { paddingHorizontal: 20, marginTop: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', marginLeft: 8 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 15, gap: 10, alignItems: 'center' },
  dropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  markAllText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  listContent: { paddingBottom: 20 },
  notificationCard: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'flex-start' },
  unreadCard: { backgroundColor: '#FFF4EC' }, // Tint for Unread
  readCard: { backgroundColor: '#FFFFFF' }, // White for Read
  cardPressed: { opacity: 0.7 },
  notificationIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  notificationContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notificationTitle: { fontSize: 15, color: '#374151', fontWeight: '400', flex: 1, marginRight: 8 },
  boldText: { fontWeight: '700', color: '#111827' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' },
  notificationMessage: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  timeText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  summaryContainer: { padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'center' },
  summaryText: { fontSize: 12, color: '#9CA3AF' },
  emptyText: { marginTop: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: '#1F2937' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 15, color: '#4B5563', fontWeight: '600' },
  optionTextActive: { color: '#D97706', fontWeight: '800' },
});