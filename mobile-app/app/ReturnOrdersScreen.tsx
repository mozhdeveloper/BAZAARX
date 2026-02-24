import React from 'react';
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
import { useReturnStore } from '../src/stores/returnStore';
import { useOrderStore } from '../src/stores/orderStore';
import { useAuthStore } from '../src/stores/authStore';

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
  const getReturnRequestsByUser = useReturnStore((state) => state.getReturnRequestsByUser);
  const returnRequests = getReturnRequestsByUser(user?.id || '2'); // Default to '2' (guest/demo) if no user, but should be logged in

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate('ReturnDetail', { returnId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>Return ID: #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.dateLabel}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>
          <View style={styles.row}>
             <Text style={styles.amountLabel}>Refund Amount:</Text>
             <Text style={styles.amountValue}>₱{item.amount.toLocaleString()}</Text>
          </View>
          <Text style={styles.reasonText}>Reason: {getStatusLabel(item.reason)}</Text>
        </View>
        
        <View style={styles.cardFooter}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={16} color={COLORS.primary} />
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <View style={{ width: 40 }} />
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    marginBottom: 12,
  },
  dateLabel: {
      fontSize: 12,
      color: '#6B7280',
      marginBottom: 8,
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
  },
  amountLabel: {
      fontSize: 14,
      color: '#4B5563',
      marginRight: 4,
  },
  amountValue: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.primary,
  },
  reasonText: {
      fontSize: 13,
      color: '#4B5563',
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      paddingTop: 12,
  },
  viewDetailsText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.primary,
      marginRight: 4,
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
