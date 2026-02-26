import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, StatusBar, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Edit2, Trash2, Home, Briefcase, MapPinned, X, ChevronDown, ChevronUp, Search, Check, Building2, Move, MapPin } from 'lucide-react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';
import { addressService, type Address } from '../src/services/addressService';
import { useAuthStore } from '../src/stores/authStore';
import { regions, provinces, cities, barangays } from 'select-philippines-address';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function AddressesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);

  // UI States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Map & Geocoding States
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Dropdown States
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);
  const [searchText, setSearchText] = useState('');

  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  const initialAddressState: Omit<Address, 'id'> = {
    label: '',
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    zipCode: '',
    landmark: '',
    deliveryInstructions: '',
    addressType: 'residential',
    isDefault: false,
    coordinates: null,
  };

  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>(initialAddressState);

  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home': return Home;
      case 'office': return Briefcase;
      default: return MapPinned;
    }
  };

  useEffect(() => {
    regions().then(res => setRegionList(res));
  }, []);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const data = await addressService.getAddresses(user.id);
        setAddresses(data);
      } catch (error) {
        console.error('Error loading addresses:', error);
      }
    };
    fetchAddresses();
  }, [user]);

  // --- GEOCODING & MAP SYNC ---
  const attemptGeocode = async (overrideAddress?: Partial<typeof newAddress>) => {
    const current = { ...newAddress, ...overrideAddress };
    const queryParts = [current.street, current.barangay, current.city, current.province, "Philippines"].filter(Boolean);
    if (queryParts.length < 3) return;

    const query = queryParts.join(', ');
    setIsGeocoding(true);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'User-Agent': 'PHAddressApp/1.0' }
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        setNewAddress(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lon } }));
        setMapRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    } catch (error) {
      console.log('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // --- HANDLERS ---
  const toggleDropdown = (name: 'region' | 'province' | 'city' | 'barangay') => {
    if (openDropdown === name) {
      setOpenDropdown(null);
    } else {
      setSearchText('');
      setOpenDropdown(name);
    }
  };

  const onRegionChange = async (code: string) => {
    const name = regionList.find(i => i.region_code === code)?.region_name || '';
    setNewAddress({ ...newAddress, region: name, province: '', city: '', barangay: '', coordinates: null });
    setOpenDropdown(null);
    setIsLoadingLocation(true);
    const provs = await provinces(code);
    setProvinceList(provs);
    setCityList([]);
    setBarangayList([]);
    setIsLoadingLocation(false);
  };

  const onProvinceChange = async (code: string) => {
    const name = provinceList.find(i => i.province_code === code)?.province_name || '';
    setNewAddress({ ...newAddress, province: name, city: '', barangay: '', coordinates: null });
    setOpenDropdown(null);
    setIsLoadingLocation(true);
    const cts = await cities(code);
    setCityList(cts);
    setBarangayList([]);
    setIsLoadingLocation(false);
  };

  const onCityChange = async (code: string) => {
    const name = cityList.find(i => i.city_code === code)?.city_name || '';
    setNewAddress({ ...newAddress, city: name, barangay: '', coordinates: null });
    setOpenDropdown(null);
    setIsLoadingLocation(true);
    const brgys = await barangays(code);
    setBarangayList(brgys);
    setIsLoadingLocation(false);
    attemptGeocode({ city: name, barangay: '' });
  };

  const onBarangayChange = (name: string) => {
    setNewAddress({ ...newAddress, barangay: name });
    setOpenDropdown(null);
    attemptGeocode({ barangay: name });
  };

  const onStreetBlur = () => {
    if (newAddress.street.length > 3) {
      attemptGeocode();
    }
  };

  const handleOpenAddressModal = async (address?: Address) => {
    setOpenDropdown(null);
    setSearchText('');

    if (address) {
      setEditingId(address.id);
      setNewAddress({ ...address });
      if (address.coordinates) {
        setMapRegion({
          latitude: address.coordinates.latitude,
          longitude: address.coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    } else {
      setEditingId(null);
      setProvinceList([]);
      setCityList([]);
      setBarangayList([]);
      setNewAddress({
        ...initialAddressState,
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        phone: user?.phone || '',
        isDefault: addresses.length === 0,
      });
      setMapRegion(DEFAULT_REGION);
    }
    setIsAddressModalOpen(true);
  };

  const handleOpenMap = () => {
    setIsMapModalOpen(true);
  };

  const handleConfirmLocation = () => {
    setNewAddress({
      ...newAddress,
      coordinates: {
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      },
    });
    setIsMapModalOpen(false);
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await addressService.updateAddress(user.id, editingId, newAddress);
        setAddresses(prev => prev.map(a => (a.id === editingId ? updated : a)));
      } else {
        const created = await addressService.createAddress(user.id, newAddress);
        setAddresses(prev => [created, ...prev]);
      }
    } catch (error) {
      console.error('Error saving address:', error);
    }

    setIsSaving(false);
    setIsAddressModalOpen(false);
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      await addressService.setDefaultAddress(user.id, id);
      setAddresses(prev => prev.map(addr => ({ ...addr, isDefault: addr.id === id })));
    } catch (error) {
      console.error('Error setting default address:', error);
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedAddressId) {
      const deleteNow = async () => {
        try {
          await addressService.deleteAddress(selectedAddressId);
          setAddresses(prev => prev.filter(addr => addr.id !== selectedAddressId));
        } catch (error) {
          console.error('Error deleting address:', error);
        }
        setShowDeleteModal(false);
        setSelectedAddressId(null);
      };
      deleteNow();
    }
  };

  // --- STRICTLY FORMATTED DROPDOWN ---
  const Dropdown = ({ label, value, type, list, disabled = false, placeholder = "Select..." }: any) => {
    const isOpen = openDropdown === type;
    const filteredList = list.filter((item: any) => {
      const itemName = item.region_name || item.province_name || item.city_name || item.brgy_name || '';
      return itemName.toLowerCase().includes(searchText.toLowerCase());
    });

    return (
      <View style={{ marginBottom: 12, zIndex: isOpen ? 100 : 1 }}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Pressable
          onPress={() => toggleDropdown(type)}
          disabled={disabled}
          style={[styles.dropdownTrigger, disabled && styles.dropdownDisabled, isOpen && styles.dropdownActive]}
        >
          <Text style={[styles.dropdownText, !value && styles.placeholderText, disabled && { color: '#9CA3AF' }]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          {isLoadingLocation && isOpen ? (
            <ActivityIndicator size="small" color="#FF6A00" />
          ) : (
            isOpen ? <ChevronUp size={20} color={disabled ? "#9CA3AF" : "#4B5563"} /> : <ChevronDown size={20} color={disabled ? "#9CA3AF" : "#4B5563"} />
          )}
        </Pressable>
        {isOpen && (
          <View style={styles.dropdownListContainer}>
            <View style={styles.searchContainer}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
            </View>
            <ScrollView style={styles.selectList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {filteredList.map((item: any, index: number) => {
                const key = `${type}-${index}`;
                let name = '';
                if (type === 'region') name = item.region_name;
                else if (type === 'province') name = item.province_name;
                else if (type === 'city') name = item.city_name;
                else name = item.brgy_name;

                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [styles.selectItem, pressed && { backgroundColor: '#FFF7ED' }]}
                    onPress={() => {
                      if (type === 'region') onRegionChange(item.region_code);
                      else if (type === 'province') onProvinceChange(item.province_code);
                      else if (type === 'city') onCityChange(item.city_code);
                      else onBarangayChange(item.brgy_name);
                    }}
                  >
                    <Text style={styles.selectItemText}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
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
        <Pressable style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]} onPress={() => handleOpenAddressModal()}>
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
                <Pressable style={styles.actionButton} onPress={() => handleOpenAddressModal(address)}><Text style={styles.actionButtonText}>Edit</Text></Pressable>
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

      {/* ADD/EDIT ADDRESS MODAL */}
      <Modal visible={isAddressModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsAddressModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1F2937' }}>{editingId ? 'Edit Address' : 'Add Address'}</Text>
            <Pressable onPress={() => setIsAddressModalOpen(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
              <X size={22} color="#1F2937" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

            <View style={styles.typeSelectorContainer}>
              <Pressable
                style={[styles.typeOption, newAddress.addressType === 'residential' && styles.typeOptionActive]}
                onPress={() => setNewAddress({ ...newAddress, addressType: 'residential' })}
              >
                <Home size={16} color={newAddress.addressType === 'residential' ? '#FF6A00' : '#6B7280'} />
                <Text style={[styles.typeOptionText, newAddress.addressType === 'residential' && styles.typeOptionTextActive]}>Residential</Text>
              </Pressable>
              <Pressable
                style={[styles.typeOption, newAddress.addressType === 'commercial' && styles.typeOptionActive]}
                onPress={() => setNewAddress({ ...newAddress, addressType: 'commercial' })}
              >
                <Building2 size={16} color={newAddress.addressType === 'commercial' ? '#FF6A00' : '#6B7280'} />
                <Text style={[styles.typeOptionText, newAddress.addressType === 'commercial' && styles.typeOptionTextActive]}>Commercial</Text>
              </Pressable>
            </View>

            <Text style={styles.sectionHeader}>Contact Information</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput value={newAddress.firstName} onChangeText={(t) => setNewAddress({ ...newAddress, firstName: t })} style={styles.input} placeholder="John" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput value={newAddress.lastName} onChangeText={(t) => setNewAddress({ ...newAddress, lastName: t })} style={styles.input} placeholder="Doe" />
              </View>
            </View>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput value={newAddress.phone} onChangeText={(t) => setNewAddress({ ...newAddress, phone: t })} style={styles.input} placeholder="+63" keyboardType="phone-pad" />

            <Text style={[styles.sectionHeader, { marginTop: 12 }]}>Location Details</Text>
            <Text style={styles.inputLabel}>Label</Text>
            <TextInput value={newAddress.label} onChangeText={(t) => setNewAddress({ ...newAddress, label: t })} style={styles.input} placeholder="Home, Office..." />

            <Dropdown label="Region" type="region" value={newAddress.region} list={regionList} />
            <Dropdown label="Province" type="province" value={newAddress.province} list={provinceList} disabled={!newAddress.region} />
            <Dropdown label="City / Municipality" type="city" value={newAddress.city} list={cityList} disabled={!newAddress.province} />
            <Dropdown label="Barangay" type="barangay" value={newAddress.barangay} list={barangayList} disabled={!newAddress.city} />

            <Text style={styles.inputLabel}>Street / House No.</Text>
            <TextInput
              value={newAddress.street}
              onChangeText={(t) => setNewAddress({ ...newAddress, street: t })}
              onEndEditing={onStreetBlur}
              style={styles.input}
              placeholder="123 Acacia St."
            />

            {/* --- LIVE MAP PREVIEW --- */}
            <Text style={styles.inputLabel}>Pin Location</Text>
            <View style={styles.mapPreviewWrapper}>
              <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                style={styles.mapPreview}
                region={mapRegion}
                scrollEnabled={false} // Disable form-scroll conflict
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                {/* Marker always at the calculated/selected coordinates */}
                {newAddress.coordinates && (
                  <Marker coordinate={newAddress.coordinates} />
                )}
              </MapView>

              {/* Loading Overlay */}
              {isGeocoding && (
                <View style={styles.mapLoadingOverlay}>
                  <ActivityIndicator color="#FF6A00" />
                  <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Locating...</Text>
                </View>
              )}

              {/* Adjust Button Overlay */}
              <View style={styles.mapOverlay}>
                <Pressable style={styles.editPinButton} onPress={handleOpenMap}>
                  <Move size={14} color="#FFF" />
                  <Text style={styles.editPinText}>Adjust Pin</Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Landmark (Optional)</Text>
            <TextInput value={newAddress.landmark || ''} onChangeText={(t) => setNewAddress({ ...newAddress, landmark: t })} style={styles.input} placeholder="Near 7-Eleven, Colored gate" />

            <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
            <TextInput
              value={newAddress.deliveryInstructions || ''}
              onChangeText={(t) => setNewAddress({ ...newAddress, deliveryInstructions: t })}
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
              placeholder="Leave at front desk..."
              multiline={true}
            />

            <Text style={styles.inputLabel}>Postal Code</Text>
            <TextInput value={newAddress.zipCode} onChangeText={(t) => setNewAddress({ ...newAddress, zipCode: t })} style={styles.input} placeholder="1000" keyboardType="number-pad" />

            <Pressable style={[styles.checkboxContainer, newAddress.isDefault && styles.checkboxActive]} onPress={() => setNewAddress({ ...newAddress, isDefault: !newAddress.isDefault })}>
              <View style={[styles.checkbox, newAddress.isDefault && { borderColor: '#16A34A', backgroundColor: '#16A34A' }]}>
                {newAddress.isDefault && <View style={{ width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4 }} />}
              </View>
              <Text style={[styles.checkboxText, newAddress.isDefault && { color: '#16A34A' }]}>Set as default delivery address</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.stickyFooter}>
            <Pressable style={[styles.confirmButton, isSaving && { opacity: 0.7 }]} onPress={handleSaveAddress} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmButtonText}>{editingId ? 'Save Changes' : 'Add Address'}</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- PRECISION MAP MODAL --- */}
      <Modal visible={isMapModalOpen} animationType="slide" onRequestClose={() => setIsMapModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
          <MapView
            style={{ flex: 1 }}
            region={mapRegion}
            onRegionChangeComplete={(region: Region) => setMapRegion(region)}
            showsUserLocation={true}
            showsMyLocationButton={true}
          />
          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <MapPin size={48} color="#FF6A00" fill="#FF6A00" />
            <View style={styles.markerShadow} />
          </View>
          <View style={[styles.mapHeader, { paddingTop: insets.top + 10 }]}>
            <Pressable onPress={() => setIsMapModalOpen(false)} style={styles.mapCloseButton}>
              <ChevronLeft size={24} color="#1F2937" />
            </Pressable>
            <Text style={styles.mapTitle}>Adjust Location</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.mapFooter}>
            <Text style={styles.mapInstruction}>Drag map to pin exact location</Text>
            <Pressable style={styles.confirmButton} onPress={handleConfirmLocation}>
              <Text style={styles.confirmButtonText}>Confirm Pin</Text>
            </Pressable>
          </View>
        </View>
      </Modal>


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