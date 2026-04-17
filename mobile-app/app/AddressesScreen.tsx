import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, StatusBar, ActivityIndicator, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Edit2, Trash2, Home, Briefcase, MapPinned, ChevronUp, ChevronDown, Search } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';
import { type Address } from '../src/services/addressService';
import { useAddressStore } from '../src/stores/addressStore';
import { useAuthStore } from '../src/stores/authStore';
import AddressFormModal from '../src/components/AddressFormModal';
import { regions, provinces, cities, barangays } from 'select-philippines-address';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;



export default function AddressesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isMounted = useRef(true);

  // Shared store
  const {
    savedAddresses: addresses,
    loadSavedAddresses,
    addSavedAddress,
    updateSavedAddress,
    deleteSavedAddress,
    setDefaultAddress: storeSetDefault,
  } = useAddressStore();

  // UI States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  
  // Dropdown and location states
  const [openDropdown, setOpenDropdown] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home': return Home;
      case 'office': return Briefcase;
      default: return MapPinned;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSavedAddresses(user.id);
  }, [user]);

  const handleOpenAddressForm = (address?: Address) => {
    setEditingAddress(address ?? null);
    setIsAddressModalOpen(true);
  };

  const handleAddressSaved = (saved: Address) => {
    if (editingAddress) {
      // update in store
      updateSavedAddress(user!.id, saved.id, saved).catch(console.error);
    }
    // reload list to reflect changes
    if (user) loadSavedAddresses(user.id);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      await storeSetDefault(user.id, id);
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedAddressId) {
      const deleteNow = async () => {
        try {
          await deleteSavedAddress(selectedAddressId);
        } catch (error) {
          console.error('Error deleting address:', error);
        }
        if (isMounted.current) {
          setShowDeleteModal(false);
          setSelectedAddressId(null);
        }
      };
      deleteNow();
    }
  };



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* HEADER */}
      <View
        style={[styles.headerContainer, { paddingTop: insets.top + 5, backgroundColor: COLORS.background }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Addresses</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ADDRESS LIST */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]} onPress={() => handleOpenAddressForm()}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </Pressable>
        {addresses.map((address) => {
          const IconComponent = getAddressIcon(address.label);
          return (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressTypeContainer}>
                  <View style={styles.iconContainer}><IconComponent size={18} color="#FF6A00" /></View>
                  <View>
                    <Text style={styles.addressType}>{address.label}</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>{address.addressType}</Text>
                  </View>
                </View>
                {address.isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>}
              </View>
              <Text style={styles.addressName}>{address.firstName} {address.lastName}</Text>
              <Text style={styles.addressDetails}>{address.street}{address.landmark ? ` (near ${address.landmark})` : ''}</Text>
              <Text style={styles.addressDetails}>{address.city}, {address.province}</Text>
              <View style={styles.actionButtons}>
                {!address.isDefault && <Pressable style={styles.actionButton} onPress={() => handleSetDefault(address.id)}><Text style={styles.actionButtonText}>Set Default</Text></Pressable>}
                <Pressable style={styles.actionButton} onPress={() => handleOpenAddressForm(address)}><Text style={styles.actionButtonText}>Edit</Text></Pressable>
                <Pressable style={styles.deleteButton} onPress={() => { setSelectedAddressId(address.id); setShowDeleteModal(true); }}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* DELETE MODAL */}
      <Modal visible={showDeleteModal} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Address</Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => setShowDeleteModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
              <Pressable style={styles.modalDeleteButton} onPress={handleDeleteConfirm}><Text style={styles.modalDeleteText}>Delete</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD/EDIT ADDRESS — shared form */}
      <AddressFormModal
        visible={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaved={handleAddressSaved}
        initialData={editingAddress}
        userId={user?.id ?? ''}
        existingCount={addresses.length}
        context="buyer"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Previous styles) ...
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    zIndex: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 40,
  },
  headerIconButton: { padding: 4, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, marginBottom: 16 },
  addButtonPressed: { backgroundColor: '#E67E00' },
  addButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  addressCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addressTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF3E8', alignItems: 'center', justifyContent: 'center' },
  addressType: { fontSize: 16, fontWeight: '700', color: '#111827' },
  defaultBadge: { backgroundColor: '#FFF6E5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0A3' },
  defaultText: { fontSize: 12, fontWeight: '700', color: '#EA580C' },
  addressName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  addressDetails: { fontSize: 14, color: '#374151', lineHeight: 20 },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FEF3E8' },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#FB8C00' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FEF2F2' },
  deleteButtonText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

  // Form & Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancelButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalCancelText: { fontWeight: '600', color: '#6B7280' },
  modalDeleteButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  modalDeleteText: { fontWeight: '700', color: '#FFF' },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { height: 44, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: '#1F2937', backgroundColor: '#FFFFFF', marginBottom: 16 },
  typeSelectorContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  typeOptionActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  typeOptionText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeOptionTextActive: { color: '#111827' },

  // Dropdown
  dropdownTrigger: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  dropdownActive: { borderColor: '#FB8C00' },
  dropdownDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  dropdownText: { fontSize: 14, color: '#1F2937', flex: 1, marginRight: 8 },
  placeholderText: { color: '#9CA3AF' },
  dropdownListContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8, marginBottom: 16, backgroundColor: '#FFFFFF', maxHeight: 250, overflow: 'hidden' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8 },
  searchInput: { flex: 1, height: 36, fontSize: 14, color: '#1F2937' },
  selectList: { backgroundColor: '#FFFFFF' },
  selectItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  selectItemText: { fontSize: 14, color: '#111827' },

  // Footer & Checkbox
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, marginTop: 8 },
  checkboxActive: { backgroundColor: '#DCFCE7' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  stickyFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFFFFF' },
  confirmButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // NEW MAP PREVIEW STYLES
  mapPreviewWrapper: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4, backgroundColor: '#F3F4F6' },
  mapPreview: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 12, right: 12 },
  editPinButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  editPinText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  // Precision Map Modal
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, zIndex: 10 },
  mapCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  mapTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
  centerMarkerContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, alignItems: 'center', justifyContent: 'center' },
  markerShadow: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.3)', transform: [{ scaleX: 2 }] },
  mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  mapInstruction: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
});