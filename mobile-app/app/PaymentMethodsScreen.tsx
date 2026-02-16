import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Plus, Trash2, Check, Building2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethods'>;

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  cardNumber?: string;
  cardHolder?: string;
  expiryDate?: string;
  cardType?: 'visa' | 'mastercard' | 'amex';
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      cardNumber: '**** **** **** 4242',
      cardHolder: 'John Doe',
      expiryDate: '12/25',
      cardType: 'visa',
      isDefault: true,
    },
    {
      id: '2',
      type: 'card',
      cardNumber: '**** **** **** 8888',
      cardHolder: 'John Doe',
      expiryDate: '08/26',
      cardType: 'mastercard',
      isDefault: false,
    },
    {
      id: '3',
      type: 'bank',
      bankName: 'BDO',
      accountNumber: '**** **** 1234',
      accountName: 'John Doe',
      isDefault: false,
    },
  ]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const handleSetDefault = (id: string) => {
    setPaymentMethods(prev =>
      prev.map(method => ({
        ...method,
        isDefault: method.id === id,
      }))
    );
  };

  const handleDeleteConfirm = () => {
    if (selectedMethodId) {
      setPaymentMethods(prev => prev.filter(method => method.id !== selectedMethodId));
      setShowDeleteModal(false);
      setSelectedMethodId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSelectedMethodId(id);
    setShowDeleteModal(true);
  };

  const getCardBrandColor = (type?: string) => {
    switch (type) {
      case 'visa':
        return '#1A1F71';
      case 'mastercard':
        return '#EB001B';
      case 'amex':
        return '#006FCF';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <LinearGradient
        colors={['#FFF6E5', '#FFE0A3', '#FFD89A']} // Pastel Gold Header
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#7C2D12" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Payment Methods</Text>
            <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Add Payment Method Button */}
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => console.log('Add payment method')}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </Pressable>

        {/* Payment Methods List */}
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>
              Add a payment method for faster checkout
            </Text>
          </View>
        ) : (
          paymentMethods.map((method) => (
            <View key={method.id} style={styles.paymentCard}>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Check size={12} color="#FFFFFF" />
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}

              {method.type === 'card' ? (
                <>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.cardTypeIndicator,
                        { backgroundColor: getCardBrandColor(method.cardType) },
                      ]}
                    >
                      <CreditCard size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.cardType}>
                      {method.cardType?.toUpperCase() || 'CARD'}
                    </Text>
                  </View>

                  <Text style={styles.cardNumber}>{method.cardNumber}</Text>
                  <View style={styles.cardDetails}>
                    <View>
                      <Text style={styles.cardLabel}>Card Holder</Text>
                      <Text style={styles.cardValue}>{method.cardHolder}</Text>
                    </View>
                    <View style={styles.expiryContainer}>
                      <Text style={styles.cardLabel}>Expires</Text>
                      <Text style={styles.cardValue}>{method.expiryDate}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardTypeIndicator, { backgroundColor: '#3B82F6' }]}>
                      <Building2 size={24} color="#FFFFFF" />
                    </View>
                    <Text style={styles.cardType}>BANK ACCOUNT</Text>
                  </View>

                  <Text style={styles.bankName}>{method.bankName}</Text>
                  <Text style={styles.accountNumber}>{method.accountNumber}</Text>
                  <View style={styles.cardDetails}>
                    <View>
                      <Text style={styles.cardLabel}>Account Name</Text>
                      <Text style={styles.cardValue}>{method.accountName}</Text>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.actionButtons}>
                {!method.isDefault && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.defaultButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => handleSetDefault(method.id)}
                  >
                    <Text style={styles.defaultButtonText}>Set as Default</Text>
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleDeleteClick(method.id)}
                >
                  <Trash2 size={18} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Secure Payments</Text>
          <Text style={styles.infoText}>
            All payment information is encrypted and securely stored. We never share your payment
            details with anyone.
          </Text>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Remove Payment Method?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalDeleteButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalDeleteText}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bottom Navigation */}
      <BuyerBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF0', // Warm Ivory
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#7C2D12' },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FB8C00', // Warm Orange
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FB8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#FFF6E5', // Very Light Gold
  },
  defaultBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF6E5', // Light Gold
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0A3',
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EA580C', // Golden Amber
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTypeIndicator: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  expiryContainer: {
    alignItems: 'flex-end',
  },
  bankName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  accountNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  defaultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  defaultButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
