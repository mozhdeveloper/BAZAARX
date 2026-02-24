import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertCircle, Package } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useReturnStore } from '../src/stores/returnStore';
import { useOrderStore } from '../src/stores/orderStore';
import { ReturnStatus } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'ReturnDetail'>;

const getStatusColor = (status: ReturnStatus) => {
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

export default function ReturnDetailScreen({ route, navigation }: Props) {
  const { returnId } = route.params;
  const insets = useSafeAreaInsets();
  const returnRequest = useReturnStore((state) => state.getReturnRequestById(returnId));
  const order = useOrderStore((state) => state.getOrderById(returnRequest?.orderId || ''));

  if (!returnRequest || !order) {
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
          <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Return Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
        <View style={styles.center}>
          <Text>Return request not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(returnRequest.status);

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
          <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Return Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Request Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(returnRequest.status)}
              </Text>
            </View>
          </View>
          
          <View style={styles.timeline}>
            {returnRequest.history.slice().reverse().map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: index === 0 ? statusColor : '#D1D5DB' }]} />
                  {index < returnRequest.history.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{getStatusLabel(event.status)}</Text>
                  <Text style={styles.timelineDate}>
                    {new Date(event.timestamp).toLocaleString()}
                  </Text>
                  {event.note && (
                    <Text style={styles.timelineNote}>{event.note}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Refund Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Refund Info</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Refund Amount</Text>
            <Text style={styles.value}>₱{returnRequest.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Refund Method</Text>
            <Text style={styles.value}>{order.paymentMethod}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{getStatusLabel(returnRequest.reason)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{getStatusLabel(returnRequest.type)}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items to Return</Text>
          {returnRequest.items.map((returnItem) => {
            const orderItem = order.items.find((i) => i.id === returnItem.itemId);
            if (!orderItem) return null;
            
            return (
              <View key={returnItem.itemId} style={styles.itemRow}>
                <Image source={{ uri: safeImageUri(orderItem.image) }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{orderItem.name}</Text>
                  <Text style={styles.itemMeta}>Qty: {returnItem.quantity}</Text>
                  <Text style={styles.itemPrice}>₱{(orderItem.price ?? 0).toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Description & Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{returnRequest.description}</Text>
          
          {returnRequest.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {returnRequest.images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.proofImage} />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  timelineDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineNote: {
    fontSize: 13,
    color: '#1F2937',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  descriptionText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  imageScroll: {
    flexDirection: 'row',
  },
  proofImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
});
