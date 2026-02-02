import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { X } from 'lucide-react-native';

interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  quantity: number;
  price: number;
  selectedColor?: string;
  selectedSize?: string;
}

interface Order {
  id: string;
  orderId: string;
  type?: 'ONLINE' | 'OFFLINE';
  createdAt: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  posNote?: string;
  status: 'pending' | 'to-ship' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
}

interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: 'pending' | 'to-ship' | 'completed' | 'cancelled') => Promise<void>;
}

export default function OrderDetailsModal({
  visible,
  order,
  onClose,
  onUpdateStatus,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'to-ship':
        return '#FF5722';
      case 'pending':
        return '#FBBF24';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#D1FAE5';
      case 'to-ship':
        return '#FFF5F0';
      case 'pending':
        return '#FEF3C7';
      default:
        return '#F3F4F6';
    }
  };

  const getActionButton = () => {
    switch (order.status) {
      case 'pending':
        return (
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
            onPress={() => onUpdateStatus(order.orderId, 'to-ship')}
          >
            <Text style={styles.actionButtonText}>Arrange Shipment</Text>
          </Pressable>
        );
      case 'to-ship':
        return (
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => onUpdateStatus(order.orderId, 'completed')}
          >
            <Text style={styles.actionButtonText}>Mark Shipped</Text>
          </Pressable>
        );
      case 'completed':
        return (
          <View style={[styles.actionButton, { backgroundColor: '#E5E7EB' }]}>
            <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>
              Completed
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Order Details</Text>
              <Text style={styles.modalSubtitle}>ID: {order.orderId}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1F2937" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {/* Status Section */}
            <View style={styles.modalSection}>

              {/* Customer Info */}
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{order.customerName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{order.customerEmail || 'N/A'}</Text>
              </View>
              {order.customerPhone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{order.customerPhone}</Text>
                </View>
              )}
              {order.shippingAddress && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{order.shippingAddress}</Text>
                </View>
              )}
              {order.posNote && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Note:</Text>
                  <Text style={styles.infoValue}>{order.posNote}</Text>
                </View>
              )}
            </View>

            {/* Items Section */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Items ({Array.isArray(order.items) ? order.items.length : 0})</Text>
              {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                <View key={index} style={styles.modalItemRow}>
                  <Image source={{ uri: item.image }} style={styles.modalItemImage} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemName} numberOfLines={2}>{item.productName}</Text>
                    {(item.selectedColor || item.selectedSize) && (
                      <Text style={styles.modalItemVariant}>
                        {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}
                      </Text>
                    )}
                    <View style={styles.modalItemPriceRow}>
                      <Text style={styles.modalItemQuantity}>x{item.quantity}</Text>
                      <Text style={styles.modalItemPrice}>₱{(item.price || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Payment Section */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Payment Details</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₱{(order.total || 0).toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.modalTotalLabel}>Total Amount</Text>
                <Text style={styles.totalAmountText}>₱{(order.total || 0).toLocaleString()}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            {getActionButton()}
            <Pressable 
              style={[styles.closeModalButton]} 
              onPress={onClose}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 70,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  modalItemRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  modalItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalItemVariant: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemQuantity: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5722',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalAmountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF5722',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  closeModalButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  closeModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
});
