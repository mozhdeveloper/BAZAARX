import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { ArrowLeft, Plus, X, Percent, Copy, Calendar, Edit, Trash2, ChevronDown, AlertCircle, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';

interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  discount: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  applicableTo: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function AdminVouchersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showApplicableDropdown, setShowApplicableDropdown] = useState(false);

  const typeOptions = ['Percentage Discount', 'Fixed Amount', 'Fixed Shipping'];
  const applicableOptions = ['All products', 'Specific categories', 'Specific seller', 'Specific products'];

  const [vouchersList, setVouchersList] = useState<Voucher[]>([
    {
      id: '1',
      code: 'WELCOME20',
      title: 'Welcome Discount',
      description: 'Get 20% off on your first order. Valid for all new users with a minimum spend of ₱500.',
      type: 'Percentage Discount',
      discount: 20,
      minPurchase: 500,
      maxDiscount: 500,
      usageLimit: 1000,
      usedCount: 342,
      applicableTo: 'All products',
      startDate: '2024-01-12',
      endDate: '2025-12-31',
      isActive: true,
    }
  ]);

  const [formData, setFormData] = useState({
    code: '',
    type: 'Percentage Discount',
    title: '',
    description: '',
    discount: '',
    minPurchase: '',
    maxDiscount: '', 
    usageLimit: '100',
    startDate: '2026-01-12',
    endDate: '2026-02-12',
    applicableTo: 'All products',
    isActive: true
  });

  const isExpired = (endDateStr: string) => {
    const today = new Date();
    const expiry = new Date(endDateStr);
    return expiry < today;
  };

  const handleCreateVoucher = () => {
    if (!formData.code || !formData.title || !formData.discount) {
      Alert.alert("Missing Info", "Code, Title, and Discount Value are required.");
      return;
    }

    const newVoucher: Voucher = {
      id: Date.now().toString(),
      code: formData.code.toUpperCase(),
      title: formData.title,
      description: formData.description,
      type: formData.type,
      discount: parseFloat(formData.discount),
      minPurchase: parseFloat(formData.minPurchase || '0'),
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
      usageLimit: parseInt(formData.usageLimit || '100'),
      usedCount: 0,
      applicableTo: formData.applicableTo,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isActive: formData.isActive,
    };

    setVouchersList([newVoucher, ...vouchersList]);
    setModalVisible(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      code: '', type: 'Percentage Discount', title: '', description: '',
      discount: '', minPurchase: '', maxDiscount: '', usageLimit: '100',
      startDate: '2026-01-12', endDate: '2026-02-12',
      applicableTo: 'All products', isActive: true
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => navigation.goBack()}><ArrowLeft size={24} color="#FFF" /></Pressable>
          <View>
            <Text style={styles.headerTitle}>Vouchers</Text>
            <Text style={styles.headerSubtitle}>Manage store promotions</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {vouchersList.map((voucher) => {
          const expired = isExpired(voucher.endDate);
          const progress = (voucher.usedCount / voucher.usageLimit) * 100;

          return (
            <View key={voucher.id} style={[styles.voucherCard, expired && styles.expiredCard]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.typeContainer}>
                  <View style={[styles.orangeIconBox, expired && { backgroundColor: COLORS.primary }]}>
                    <Percent size={14} color="#FFF" strokeWidth={3} />
                  </View>
                  <View style={[styles.pillBadge, expired && { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[styles.pillBadgeText, expired && { color: '#64748B' }]}>{voucher.type}</Text>
                  </View>
                </View>
                
                {expired ? (
                  <View style={styles.expiredLabel}>
                    <AlertCircle size={14} color="#DC2626" />
                    <Text style={styles.expiredLabelText}>EXPIRED</Text>
                  </View>
                ) : (
                  <View style={[styles.switchSmall, voucher.isActive && styles.switchActive]}>
                    <View style={[styles.switchThumbSmall, voucher.isActive && styles.switchThumbActiveSmall]} />
                  </View>
                )}
              </View>

              <View style={styles.codeContainer}>
                <View style={[styles.codeBox, expired && { backgroundColor: '#F8FAFC' }]}>
                  <Text style={[styles.codeText, expired && { color: '#64748B' }]}>{voucher.code}</Text>
                </View>
                <TouchableOpacity><Copy size={18} color="#64748B" /></TouchableOpacity>
              </View>

              <Text style={styles.titleText}>{voucher.title}</Text>
              <Text style={styles.descriptionText}>{voucher.description}</Text>

              <View style={styles.applicableRow}>
                <ShoppingBag size={14} color="#64748B" />
                <Text style={styles.applicableText}>Applies to: <Text style={{fontWeight: '700'}}>{voucher.applicableTo}</Text></Text>
              </View>

              <View style={[styles.summaryBox, expired && { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.summaryValue, expired && { color: '#991B1B' }]}>
                  {voucher.type === 'Percentage Discount' ? `${voucher.discount}% OFF` : `₱${voucher.discount} OFF`}
                </Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                  <Text style={styles.summarySub}>Min purchase: ₱{voucher.minPurchase}</Text>
                  {voucher.maxDiscount && (
                    <Text style={styles.summarySub}>• Max: ₱{voucher.maxDiscount}</Text>
                  )}
                </View>
              </View>

              <View style={styles.usageRow}>
                <Text style={styles.usageLabel}>Usage Limit</Text>
                <Text style={styles.usageCount}>{voucher.usedCount} / {voucher.usageLimit}</Text>
              </View>

              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <View style={styles.dateContainer}>
                <View style={styles.dateSubRow}>
                  <Calendar size={14} color={expired ? "#DC2626" : "#6B7280"} />
                  <Text style={[styles.dateText, expired && { color: '#DC2626', fontWeight: '700' }]}>{voucher.startDate}</Text>
                </View>
                <Text style={styles.toText}>to</Text>
                <Text style={[styles.dateText, expired && { color: '#DC2626', fontWeight: '700' }]}>{voucher.endDate}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn}><Edit size={18} color="#111827" /><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setVouchersList(vouchersList.filter(v => v.id !== voucher.id))}>
                  <Trash2 size={18} color="#DC2626" /><Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={() => setModalVisible(true)}>
        <Plus size={25} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create New Voucher</Text>
                <Text style={styles.modalSubtitle}>Fill in all discount details</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#6B7280" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Voucher Code*</Text>
                <TextInput style={styles.input} placeholder="e.g. SAVE20" value={formData.code} onChangeText={(t) => setFormData({...formData, code: t})} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title*</Text>
                <TextInput style={styles.input} placeholder="Voucher Title" value={formData.title} onChangeText={(t) => setFormData({...formData, title: t})} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description*</Text>
                <TextInput style={[styles.input, {height: 60, textAlignVertical: 'top'}]} multiline placeholder="Describe the benefits..." value={formData.description} onChangeText={(t) => setFormData({...formData, description: t})} />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Voucher Type*</Text>
                <TouchableOpacity style={styles.selectInput} onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
                  <Text style={styles.selectText}>{formData.type}</Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={styles.dropdownMenu}>
                    {typeOptions.map(opt => (
                      <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setFormData({...formData, type: opt}); setShowTypeDropdown(false); }}>
                        <Text style={styles.dropdownItemText}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Value ({formData.type.includes('Percentage') ? '%' : '₱'})*</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.discount} onChangeText={(t) => setFormData({...formData, discount: t})} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Min. Purchase (₱)*</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={formData.minPurchase} onChangeText={(t) => setFormData({...formData, minPurchase: t})} />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Usage Limit*</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="100" value={formData.usageLimit} onChangeText={(t) => setFormData({...formData, usageLimit: t})} />
                </View>
                {formData.type === 'Percentage Discount' && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Max Discount (₱)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" placeholder="Optional" value={formData.maxDiscount} onChangeText={(t) => setFormData({...formData, maxDiscount: t})} />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Applicable To*</Text>
                <TouchableOpacity style={styles.selectInput} onPress={() => setShowApplicableDropdown(!showApplicableDropdown)}>
                  <Text style={styles.selectText}>{formData.applicableTo}</Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>
                {showApplicableDropdown && (
                  <View style={styles.dropdownMenu}>
                    {applicableOptions.map(opt => (
                      <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setFormData({...formData, applicableTo: opt}); setShowApplicableDropdown(false); }}>
                        <Text style={styles.dropdownItemText}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}><Text style={styles.inputLabel}>Start Date</Text><TextInput style={styles.input} value={formData.startDate} onChangeText={(t) => setFormData({...formData, startDate: t})} /></View>
                <View style={{ flex: 1 }}><Text style={styles.inputLabel}>End Date</Text><TextInput style={styles.input} value={formData.endDate} onChangeText={(t) => setFormData({...formData, endDate: t})} /></View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleCreateVoucher}><Text style={styles.submitButtonText}>Create Voucher</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  scrollContent: { padding: 16 },
  voucherCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  expiredCard: { borderColor: '#FECACA', borderWidth: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  typeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orangeIconBox: { backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pillBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  pillBadgeText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  expiredLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  expiredLabelText: { color: '#DC2626', fontWeight: '800', fontSize: 11 },
  codeContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  codeBox: { backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  codeText: { color: '#EA580C', fontWeight: '700', fontSize: 16 },
  titleText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  descriptionText: { fontSize: 13, color: '#64748B', marginVertical: 8, lineHeight: 18 },
  applicableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  applicableText: { fontSize: 12, color: '#64748B' },
  summaryBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 16 },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  summarySub: { fontSize: 13, color: '#64748B' },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  usageLabel: { fontSize: 12, color: '#64748B' },
  usageCount: { fontSize: 12, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  dateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' },
  dateSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: '#475569' },
  toText: { color: '#64748B' },
  actionRow: { flexDirection: 'row', gap: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  editBtnText: { color: '#0F172A', fontWeight: '600' },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderWidth: 1, borderColor: '#FEE2E2', borderRadius: 8 },
  deleteBtnText: { color: '#DC2626', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, color: '#64748B' },
  modalForm: { padding: 20 },
  inputGroup: { marginBottom: 18 },
  inputRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12 },
  selectInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between' },
  selectText: { fontSize: 14 },
  dropdownMenu: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginTop: 4, elevation: 3 },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14 },
  switchActive: { backgroundColor: COLORS.primary },
  switchSmall: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#D1D5DB', padding: 2 },
  switchThumbSmall: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },
  switchThumbActiveSmall: { alignSelf: 'flex-end' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelButton: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelButtonText: { color: '#475569', fontWeight: '700' },
  submitButton: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitButtonText: { color: '#FFF', fontWeight: '700' },
});