import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  RefreshControl
} from 'react-native';
import { ArrowLeft, Bell, Truck, CheckCircle2, XCircle, Package, Settings } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { notificationService, Notification } from '../src/services/notificationService';
import { orderService } from '../src/services/orderService';
import { useAuthStore } from '../src/stores/authStore';
import { COLORS } from '../src/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';


type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

// --- Helper Functions ---
const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};

const getStyles = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('shipped') || t.includes('delivered') || t.includes('out_for_delivery')) {
    return { Icon: Truck, color: '#EA580C', bg: '#FFEDD5', border: '#FED7AA' };
  }
  if (t.includes('confirmed') || t.includes('placed')) {
    return { Icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7', border: '#BBF7D0' };
  }
  if (t.includes('cancelled') || t.includes('returned') || t.includes('rejected')) {
    return { Icon: XCircle, color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' };
  }
  if (t.includes('processing')) {
    return { Icon: Package, color: '#2563EB', bg: '#DBEAFE', border: '#BFDBFE' };
  }
  return { Icon: Bell, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };
};

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await notificationService.getNotifications(user.id, 'buyer', 50);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await notificationService.markAllAsRead(user.id, 'buyer');
  };

  const handlePress = async (n: Notification) => {
    if (!n.is_read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      notificationService.markAsRead(n.id);
    }

    const orderId = n.action_data?.orderId || n.action_data?.orderNumber;
    if (orderId) {
      setProcessingId(n.id);
      try {
        const uiOrder = await orderService.getOrderById(orderId);
        if (uiOrder) {
          navigation.navigate('OrderDetail', { order: uiOrder });
        } else {
          navigation.navigate('Orders' as any);
        }
      } catch (e) {
        navigation.navigate('Orders' as any);
      } finally {
        setProcessingId(null);
      }
    } else {
      navigation.navigate('Orders' as any);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* --- HEADER --- */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
            </Pressable>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('NotificationSettings')} style={styles.settingsButton}>
            <Settings size={22} color={COLORS.textHeadline} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Action Bar (Mark All Read) */}
      {unreadCount > 0 && (
        <View style={styles.actionsBar}>
          <Pressable onPress={handleMarkAllRead} style={styles.markReadAction}>
            <Text style={styles.markReadActionText}>Mark all as read</Text>
          </Pressable>
        </View>
      )}

      {/* --- CONTENT --- */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Bell size={40} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>
                Order updates and alerts will appear here
              </Text>
            </View>
          ) : (
            <View>
              {notifications.map((item) => {
                const { Icon, color, bg, border } = getStyles(item.type);
                const isProcessing = processingId === item.id;

                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.item,
                      // LOGIC FLIPPED: White for Unread, Gray for Read
                      item.is_read ? styles.readItem : styles.unreadItem,
                      pressed && styles.itemPressed
                    ]}
                    onPress={() => handlePress(item)}
                    disabled={isProcessing}
                    accessibilityLabel={`${item.title}, ${item.message}`}
                    accessibilityHint={!item.is_read ? "Unread notification" : "Read notification"}
                  >
                    {/* Icon Box */}
                    <View style={[styles.iconBox, { backgroundColor: bg, borderColor: border }]}>
                      <Icon size={18} color={color} />
                    </View>

                    {/* Content */}
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text
                          numberOfLines={1}
                          style={[styles.itemTitle, !item.is_read && styles.boldText]}
                        >
                          {item.title}
                        </Text>

                        {/* Unread Dot - Aligned Right via justify-between */}
                        {!item.is_read && <View style={styles.unreadDot} />}

                        {isProcessing && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
                      </View>

                      <Text numberOfLines={2} style={styles.itemMessage}>
                        {item.message}
                      </Text>

                      <Text style={styles.itemTime}>
                        {formatTimeAgo(item.created_at)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titleWithBadge: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  newBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8
  },
  newBadgeText: { color: '#FFEDD5', fontSize: 12, fontWeight: '700' },
  settingsButton: { padding: 4 },

  // Actions Bar
  actionsBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  markReadAction: { paddingVertical: 4 },
  markReadActionText: { color: '#EA580C', fontSize: 14, fontWeight: '600' },

  // Content
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 20 },

  // Empty State
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // List Item
  item: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eba3', // Slightly darker divider
    alignItems: 'flex-start',
  },
  unreadItem: {
    backgroundColor: '#FFFFFF', // Bright White for Unread
  },
  readItem: {
    backgroundColor: '#F9FAFB', // Dim Gray for Read
  },
  itemPressed: {
    opacity: 0.7,
  },

  // Icon
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, borderWidth: 1,
  },

  // Content Text
  itemContent: { flex: 1 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes Dot to the right
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '400',
    flex: 1,
    marginRight: 8,
  },
  boldText: {
    fontWeight: '700', // Extra bold for unread
    color: '#111827',
  },

  // Unread Dot
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },

  itemMessage: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 6 },
  itemTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
});