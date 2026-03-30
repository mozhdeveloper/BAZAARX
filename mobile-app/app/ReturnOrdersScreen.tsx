import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { returnService, MobileReturnRequest } from '../src/services/returnService';

type Props = NativeStackScreenProps<RootStackParamList, 'ReturnOrders'>;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
    case 'refunded':
      return COLORS.success;
    case 'rejected':
      return COLORS.error;
    case 'pending_review':
    case 'seller_response_required':
      return COLORS.warning;
    default:
      return COLORS.primary;
  }
};

const getStatusLabel = (status: string) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function ReturnOrdersScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [returnRequests, setReturnRequests] = useState<MobileReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      returnService.getReturnRequestsByBuyer(user.id)
        .then(data => setReturnRequests(data))
        .catch(err => console.error('Failed to load return requests:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ReturnDetail', { returnId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.orderId} numberOfLines={2}>Return ID: #{item.id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.dateLabel}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={styles.row}>
             <Text style={styles.amountLabel}>Refund Amount:</Text>
             <Text style={styles.amountValue}>₱{(item.refundAmount ?? 0).toLocaleString()}</Text>
          </View>
          {item.returnReason && (
            <Text style={styles.reasonText}>Reason: {getStatusLabel(item.returnReason)}</Text>
          )}
        </View>
        
        <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.viewDetailsText}>View Details</Text>
                <ChevronRight size={14} color={COLORS.primary} strokeWidth={3} />
            </View>
        </View>
      </Pressable>
    );
  }, [navigation]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>My Returns</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {returnRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No return requests</Text>
          <Text style={styles.emptyText}>You haven't made any return or refund requests yet.</Text>
        </View>
      ) : (
        <FlatList
          data={returnRequests}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  listContent: {
    padding: 16,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardContent: {
    marginBottom: 16,
  },
  dateLabel: {
      fontSize: 13,
      color: '#9CA3AF',
      marginBottom: 10,
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
  },
  amountLabel: {
      fontSize: 14,
      color: '#4B5563',
      marginRight: 6,
      fontWeight: '500',
  },
  amountValue: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.primary,
  },
  reasonText: {
      fontSize: 14,
      color: '#4B5563',
      marginTop: 4,
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: '#F9FAFB',
  },
  viewDetailsText: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.primary,
      marginRight: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
