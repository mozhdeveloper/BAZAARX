import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, CreditCard, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';
import { paymentMethodService, type SavedPaymentMethod } from '../src/services/paymentMethodService';
import { useAuthStore } from '../src/stores/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethods'>;

interface NewCardForm {
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCVV: string;
}

export default function PaymentMethodsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paymongo' | 'gcash' | 'card' | null>(null);
  const [newCard, setNewCard] = useState<NewCardForm>({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: '',
  });
  const [error, setError] = useState<string | null>(null);

  const loadPaymentMethods = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const methods = await paymentMethodService.getSavedPaymentMethods(user.id);
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Error loading payment methods:', err);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (selectedPaymentMethod === 'paymongo') {
        loadPaymentMethods();
      }
    }, [selectedPaymentMethod, user?.id])
  );

  const validateCardForm = (): boolean => {
    if (!newCard.cardNumber || newCard.cardNumber.length !== 16) {
      setError('Card number must be 16 digits');
      return false;
    }
    if (!newCard.cardExpiry || !/^\d{2}\/\d{2}$/.test(newCard.cardExpiry)) {
      setError('Expiry must be MM/YY format');
      return false;
    }
    
    // Validate expiry is not in the past
    const [month, year] = newCard.cardExpiry.split('/').map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      setError('Card has expired');
      return false;
    }
    
    if (!newCard.cardCVV || newCard.cardCVV.length !== 3) {
      setError('CVV must be 3 digits');
      return false;
    }
    if (!newCard.cardName.trim()) {
      setError('Card name is required');
      return false;
    }
    return true;
  };

  const handleAddCard = async () => {
    if (!user?.id || !validateCardForm()) return;

    setSaving(true);
    setError(null);

    try {
      const isDefault = paymentMethods.length === 0; // First card is default

      await paymentMethodService.savePaymentMethod(
        user.id,
        {
          cardNumber: newCard.cardNumber,
          cardName: newCard.cardName,
          expiryDate: newCard.cardExpiry,
          cvv: newCard.cardCVV,
        },
        isDefault
      );

      await loadPaymentMethods();
      setShowAddModal(false);
      setNewCard({ cardNumber: '', cardName: '', cardExpiry: '', cardCVV: '' });
      Alert.alert('Success', 'Card added successfully!');
    } catch (err) {
      console.error('Error adding card:', err);
      setError('Failed to add card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = (cardId: string, lastFour: string) => {
    Alert.alert('Delete Card', `Remove card ending in ${lastFour}?`, [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const success = await paymentMethodService.deletePaymentMethod(user!.id, cardId);
            if (success) {
              await loadPaymentMethods();
              Alert.alert('Success', 'Card removed');
            } else {
              Alert.alert('Error', 'Failed to delete card');
            }
          } catch (err) {
            console.error('Error deleting card:', err);
            Alert.alert('Error', 'Failed to delete card');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleSetDefault = async (cardId: string) => {
    if (!user?.id) return;

    try {
      await paymentMethodService.setDefaultPaymentMethod(user.id, cardId);
      await loadPaymentMethods();
    } catch (err) {
      console.error('Error setting default card:', err);
      Alert.alert('Error', 'Failed to set default card');
    }
  };

  const formatCardNumber = (text: string): string => {
    return text.replace(/\D/g, '').slice(0, 16);
  };

  const formatExpiry = (text: string): string => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const formatCVV = (text: string): string => {
    return text.replace(/\D/g, '').slice(0, 3);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <Pressable onPress={() => setShowAddModal(true)} style={styles.headerIconButton}>
            <Plus size={24} color={COLORS.primary} strokeWidth={2.5} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Payment Method Selection */}
        {!selectedPaymentMethod ? (
          <View style={styles.methodSelectionContainer}>
            <Text style={styles.methodSelectionTitle}>Select Payment Method</Text>

            {/* PayMongo Option */}
            <Pressable
              style={styles.methodOption}
              onPress={() => setSelectedPaymentMethod('paymongo')}
            >
              <View style={styles.methodOptionContent}>
                <View style={styles.methodIcon}>
                  <CreditCard size={28} color="#D97706" strokeWidth={2} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>PayMongo</Text>
                  <Text style={styles.methodDescription}>Credit/Debit Cards - Visa, Mastercard</Text>
                </View>
              </View>
              <CheckCircle2 size={24} color={COLORS.primary} strokeWidth={2} />
            </Pressable>

            {/* GCash Option - Coming Soon */}
            <Pressable
              style={[styles.methodOption, styles.methodOptionDisabled]}
              disabled
            >
              <View style={styles.methodOptionContent}>
                <View style={[styles.methodIcon, styles.methodIconDisabled]}>
                  <CreditCard size={28} color="#D1D5DB" strokeWidth={2} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, styles.methodNameDisabled]}>GCash</Text>
                  <Text style={[styles.methodDescription, styles.methodDescriptionDisabled]}>
                    Mobile wallet
                  </Text>
                </View>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </Pressable>

            {/* Credit/Debit Card Option - Coming Soon */}
            <Pressable
              style={[styles.methodOption, styles.methodOptionDisabled]}
              disabled
            >
              <View style={styles.methodOptionContent}>
                <View style={[styles.methodIcon, styles.methodIconDisabled]}>
                  <CreditCard size={28} color="#D1D5DB" strokeWidth={2} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, styles.methodNameDisabled]}>
                    Installment Plans
                  </Text>
                  <Text style={[styles.methodDescription, styles.methodDescriptionDisabled]}>
                    Buy now, pay later
                  </Text>
                </View>
              </View>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Back Button */}
            <Pressable
              style={styles.backButton}
              onPress={() => setSelectedPaymentMethod(null)}
            >
              <ArrowLeft size={20} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>

            {/* PayMongo Cards Content */}
            {loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading payment methods...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={48} color="#EF4444" strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={loadPaymentMethods}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : paymentMethods.length === 0 ? (
              <View style={styles.centerContent}>
                <View style={styles.emptyIconWrapper}>
                  <CreditCard size={52} color="#D97706" strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyTitle}>No Cards Saved</Text>
                <Text style={styles.emptySubtitle}>
                  Add a PayMongo card to save it for faster checkout next time.
                </Text>
                <Pressable
                  style={styles.addCardButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.addCardButtonText}>Add Payment Method</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.savedCardsLabel}>Your Saved Cards</Text>
                <View style={styles.cardsList}>
                  {paymentMethods.map((method) => (
                    <Pressable
                      key={method.id}
                      style={styles.cardContainer}
                      onPress={() => handleSetDefault(method.id)}
                      disabled={method.isDefault}
                    >
                      <View style={styles.cardContent}>
                        <View style={styles.cardLeft}>
                          <CreditCard size={32} color={COLORS.primary} strokeWidth={1.5} />
                          <View style={styles.cardInfo}>
                            <Text style={styles.cardName}>{method.cardholderName}</Text>
                          </View>
                        </View>

                        <View style={styles.cardRight}>
                          <Pressable
                            onPress={() => handleDeleteCard(method.id, method.lastFour)}
                            hitSlop={10}
                          >
                            <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                          </Pressable>
                          {method.isDefault ? (
                            <View style={styles.defaultBadge}>
                              <CheckCircle2 size={18} color="#10B981" strokeWidth={2} />
                              <Text style={styles.defaultText}>Default</Text>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => handleSetDefault(method.id)}
                              style={styles.setDefaultButton}
                              hitSlop={10}
                            >
                              <Text style={styles.setDefaultText}>Set Default</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={styles.addAnothercardButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Plus size={20} color={COLORS.primary} strokeWidth={2} />
                  <Text style={styles.addAnotherCardButtonText}>Add Another Card</Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Card Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.modalContent, { paddingTop: insets.top }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              scrollEnabled={true}
              contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 20 }}
            >
              {error && (
                <View style={styles.modalErrorContainer}>
                  <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                  <Text style={styles.modalErrorText}>{error}</Text>
                </View>
              )}

              {/* Required Fields Notice */}
              <View style={styles.requiredFieldsBox}>
                <AlertCircle size={14} color="#D97706" strokeWidth={2} />
                <Text style={styles.requiredFieldsText}>
                  All fields are required to save your card
                </Text>
              </View>

              {/* Card Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <View style={styles.inputWrapper}>
                  <CreditCard size={20} color={COLORS.primary} strokeWidth={1.5} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor="#D1D5DB"
                    value={newCard.cardNumber}
                    onChangeText={(text) => {
                      const formatted = formatCardNumber(text);
                      setNewCard({ ...newCard, cardNumber: formatted });
                      setError(null);
                    }}
                    keyboardType="numeric"
                    maxLength={19}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Card Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <TextInput
                  style={[styles.textInput, styles.simpleInput]}
                  placeholder="JUAN DELA CRUZ"
                  placeholderTextColor="#D1D5DB"
                  value={newCard.cardName}
                  onChangeText={(text) => {
                    setNewCard({ ...newCard, cardName: text.toUpperCase() });
                    setError(null);
                  }}
                  editable={!saving}
                />
              </View>

              {/* Expiry and CVV Row */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={[styles.textInput, styles.simpleInput]}
                    placeholder="MM/YY"
                    placeholderTextColor="#D1D5DB"
                    value={newCard.cardExpiry}
                    onChangeText={(text) => {
                      const formatted = formatExpiry(text);
                      setNewCard({ ...newCard, cardExpiry: formatted });
                      setError(null);
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                    editable={!saving}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={[styles.textInput, styles.simpleInput]}
                    placeholder="123"
                    placeholderTextColor="#D1D5DB"
                    value={newCard.cardCVV}
                    onChangeText={(text) => {
                      const formatted = formatCVV(text);
                      setNewCard({ ...newCard, cardCVV: formatted });
                      setError(null);
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry={true}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <AlertCircle size={16} color="#6366F1" strokeWidth={2} />
                <Text style={styles.infoText}>
                  Use test PayMongo card numbers for development. Cards are encrypted and stored securely.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.addButton, saving && styles.buttonDisabled]}
                onPress={handleAddCard}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={20} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.addButtonText}>Add Card</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {paymentMethods.length > 0 && <BuyerBottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  body: { flex: 1 },
  methodSelectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  methodSelectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 20,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 12,
  },
  methodOptionDisabled: {
    borderColor: '#E5E7EB',
    opacity: 0.6,
  },
  methodOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconDisabled: {
    backgroundColor: '#F3F4F6',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  methodNameDisabled: {
    color: '#9CA3AF',
  },
  methodDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  methodDescriptionDisabled: {
    color: '#D1D5DB',
  },
  comingSoonBadge: {
    backgroundColor: '#FDF2E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  savedCardsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textHeadline,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addAnothercardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  addAnotherCardButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  cardsList: { paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    marginBottom: 4,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600', color: COLORS.textHeadline, marginBottom: 4 },
  cardNumber: { fontSize: 16, fontWeight: '700', color: COLORS.textHeadline },
  cardExpiry: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  defaultText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  setDefaultButton: { paddingHorizontal: 12, paddingVertical: 6 },
  setDefaultText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  deleteButton: { padding: 8 },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addCardButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  errorContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '96%',
    minHeight: 'auto',
    flexDirection: 'column',
    flex: 1,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline },
  modalScroll: { flex: 1 },
  modalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    width: '100%',
  },
  modalErrorText: { fontSize: 12, color: '#DC2626', fontWeight: '500', flex: 1 },
  inputGroup: { marginBottom: 18, width: '100%' },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textHeadline, marginBottom: 8, width: '100%' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    width: '100%',
  },
  textInput: { flex: 1, fontSize: 14, color: COLORS.textHeadline, paddingVertical: 0, minHeight: 40 },
  simpleInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF', minHeight: 44, width: '100%' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0E7FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 24,
    width: '100%',
  },
  infoText: { fontSize: 12, color: '#4F46E5', fontWeight: '500', flex: 1 },
  requiredFieldsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    width: '100%',
  },
  requiredFieldsText: { fontSize: 12, color: '#92400E', fontWeight: '500', flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 32 },
  modalButton: { flex: 1, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  cancelButton: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  cancelButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.textHeadline },
  addButton: { backgroundColor: COLORS.primary },
  addButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.6 },
});
