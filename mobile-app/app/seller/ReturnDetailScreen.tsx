import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, XCircle, MessageCircle } from 'lucide-react-native';
import { COLORS } from '../../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { useReturnStore } from '../../src/stores/returnStore';
import { useOrderStore } from '../../src/stores/orderStore';
import { ReturnStatus } from '../../src/types';
import { safeImageUri } from '../../src/utils/imageUtils';

type Props = NativeStackScreenProps<SellerStackParamList, 'ReturnDetail'>;

const getStatusLabel = (status: string) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function SellerReturnDetailScreen({ route, navigation }: Props) {
  const { returnId } = route.params;
  const returnRequest = useReturnStore((state) => state.getReturnRequestById(returnId));
  const updateReturnStatus = useReturnStore((state) => state.updateReturnStatus);
  const order = useOrderStore((state) => state.getOrderById(returnRequest?.orderId || ''));
  const insets = useSafeAreaInsets();

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!returnRequest || !order) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
            <View style={styles.headerTop}>
                <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                    <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.headerTitle}>Return Request</Text>
                <View style={{ width: 40 }} />
            </View>
        </View>
        <View style={styles.center}>
          <Text>Return request not found.</Text>
        </View>
      </View>
    );
  }

  const handleApprove = () => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this return request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            updateReturnStatus(returnRequest.id, 'approved', 'Request approved by seller', 'seller');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }

    updateReturnStatus(returnRequest.id, 'rejected', rejectReason, 'seller');
    setRejectModalVisible(false);
    navigation.goBack();
  };

  const handleMarkRefunded = () => {
    Alert.alert(
      'Confirm Refund',
      'Mark this request as refunded?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Refunded',
          onPress: () => {
            updateReturnStatus(returnRequest.id, 'refunded', 'Refund completed', 'seller');
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: '#FF5722' }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Return Request</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Buyer Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Buyer Information</Text>
          <Text style={styles.label}>Name: <Text style={styles.value}>{typeof order.shippingAddress === 'object' && order.shippingAddress?.name ? String(order.shippingAddress.name) : 'N/A'}</Text></Text>
          <Text style={styles.label}>Order ID: <Text style={styles.value}>{order.transactionId}</Text></Text>
        </View>

        {/* Request Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.value, { color: COLORS.primary, fontWeight: '700' }]}>
              {getStatusLabel(returnRequest.status)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Reason</Text>
            <Text style={styles.value}>{getStatusLabel(returnRequest.reason)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>{getStatusLabel(returnRequest.type)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Refund Amount</Text>
            <Text style={styles.value}>₱{returnRequest.amount.toLocaleString()}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {returnRequest.items.map((returnItem) => {
            const orderItem = order.items.find((i) => i.id === returnItem.itemId);
            if (!orderItem) return null;
            
            return (
              <View key={returnItem.itemId} style={styles.itemRow}>
                <Image source={{ uri: safeImageUri(orderItem.image) }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{typeof orderItem.name === 'object' ? (orderItem.name as any)?.name || '' : String(orderItem.name || '')}</Text>
                  <Text style={styles.itemMeta}>Qty: {returnItem.quantity}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Description & Photos */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Buyer's Note</Text>
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

      {/* Action Buttons (only if pending) */}
      {returnRequest.status === 'pending_review' && (
        <View style={styles.footer}>
          <Pressable style={styles.rejectButton} onPress={() => setRejectModalVisible(true)}>
            <XCircle size={20} color={COLORS.error} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable style={styles.approveButton} onPress={handleApprove}>
            <CheckCircle size={20} color="#FFF" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </Pressable>
        </View>
      )}
      {returnRequest.status === 'approved' && (
        <View style={styles.footer}>
          <Pressable style={styles.approveButton} onPress={handleMarkRefunded}>
            <CheckCircle size={20} color="#FFF" />
            <Text style={styles.approveButtonText}>Mark as Refunded</Text>
          </Pressable>
        </View>
      )}

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason..."
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmButton} onPress={handleReject}>
                <Text style={styles.modalConfirmText}>Confirm Rejection</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
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
  },
  descriptionText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 12,
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
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: '#FFF',
    gap: 8,
  },
  rejectButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    gap: 8,
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    height: 100,
    marginBottom: 16,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
