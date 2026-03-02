import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
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
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import { notificationService, type Notification } from '../../src/services/notificationService';
import SellerDrawer from '../../src/components/SellerDrawer';

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
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterType, setFilterType] = useState('All Types');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!seller?.id) return;
    try {
      const data = await notificationService.getNotifications(seller.id, 'seller', 100);
      setNotifications(data);
    } catch (error) {
      console.error('[Notifications] Error fetching:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [seller?.id]);

  useEffect(() => {
    fetchNotifications();

    // Real-time subscription for live seller notification updates
    let unsubRealtime: (() => void) | undefined;
    if (seller?.id) {
      unsubRealtime = notificationService.subscribeToNotifications(
        seller.id,
        'seller',
        (newNotif) => {
          // Prepend the new notification to the list
          setNotifications((prev) => [{
            id: newNotif.id,
            user_id: seller.id!,
            user_type: 'seller' as const,
            type: newNotif.type,
            title: newNotif.title,
            message: newNotif.message,
            action_url: newNotif.action_url,
            action_data: newNotif.action_data,
            is_read: false,
            read_at: undefined,
            priority: newNotif.priority,
            created_at: newNotif.created_at,
          }, ...prev]);
        }
      );
    }

    return () => {
      unsubRealtime?.();
    };
  }, [fetchNotifications, seller?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    if (!seller?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await notificationService.markAllAsRead(seller.id, 'seller');
  };

  const handlePress = async (n: Notification) => {
    if (!n.is_read) {
      // Optimistic update: card only marks as read when tapped
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      await notificationService.markAsRead(n.id, 'seller');
    }
    if (n.type.includes('order')) {
      (navigation as any).navigate('SellerOrderDetail', { orderId: n.action_data?.orderId });
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch = !searchQuery || [n.title, n.message].some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = filterStatus === 'All' || (filterStatus === 'Unread' ? !n.is_read : n.is_read);
      const matchesType = filterType === 'All Types' || n.type.toLowerCase().includes(filterType.toLowerCase().replace(' ', '_'));
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [notifications, searchQuery, filterStatus, filterType]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handlePress(item)}
      style={({ pressed }) => [
        styles.notificationCard,
        item.is_read ? styles.readCard : styles.unreadCard,
        pressed && styles.cardPressed
      ]}
    >
      <View style={styles.notificationIcon}>
        <Bell size={20} color={item.is_read ? '#9CA3AF' : '#D97706'} />
      </View>
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
  );

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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D97706']} />}
        ListEmptyComponent={loading ? <ActivityIndicator size="large" color="#D97706" style={{ marginTop: 40 }} /> : null}
      />

      {/* Sticky Footer Summary */}
      {notifications.length > 0 && (
        <View style={[styles.summaryContainer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.summaryText}>
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </Text>
        </View>
      )}

      <SelectionModal visible={showTypeMenu} onClose={() => setShowTypeMenu(false)} title="Select Type" options={['All Types', 'Orders', 'Returns', 'System']} current={filterType} onSelect={(val: string) => { setFilterType(val); setShowTypeMenu(false); }} />
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
  notificationIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  notificationContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notificationTitle: { fontSize: 15, color: '#374151', fontWeight: '400', flex: 1, marginRight: 8 },
  boldText: { fontWeight: '700', color: '#111827' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' },
  notificationMessage: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  timeText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  summaryContainer: { padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'center' },
  summaryText: { fontSize: 12, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: '#1F2937' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 15, color: '#4B5563', fontWeight: '600' },
  optionTextActive: { color: '#D97706', fontWeight: '800' },
});