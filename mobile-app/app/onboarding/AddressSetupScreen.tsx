import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  Briefcase,
  MapPin,
  ChevronDown,
  ChevronUp,
  Search,
  Move,
  Building2,
  ArrowRight
} from 'lucide-react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { addressService, type Address } from '../../src/services/addressService';
import { useAuthStore } from '../../src/stores/authStore';
import { regions, provinces, cities, barangays } from 'select-philippines-address';

import { supabase } from '../../src/lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AddressSetup'>;

const DEFAULT_REGION = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function AddressSetupScreen({ navigation, route }: Props) {
  // Get signup data passed from previous screens
  const { signupData } = route.params || {};

  const { user } = useAuthStore();
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
    label: 'Home',
    firstName: signupData?.firstName || '',
    lastName: signupData?.lastName || '',
    phone: signupData?.phone || '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    zipCode: '',
    landmark: '',
    deliveryInstructions: '',
    addressType: 'residential',
    isDefault: true,
    coordinates: null,
  };

  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>(initialAddressState);

  useEffect(() => {
    regions().then(res => setRegionList(res));
  }, []);

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

  const handleFinish = async () => {
    // Basic Validation
    if (!newAddress.region || !newAddress.province || !newAddress.city || !newAddress.barangay || !newAddress.street) {
        Alert.alert('Missing Information', 'Please fill in all address fields.');
        return;
    }

    setIsSaving(true);

    try {
        let userId = '';

        // 1. Perform Deferred Signup
        if (signupData) {
            const { data, error } = await supabase.auth.signUp({
                email: signupData.email,
                password: signupData.password,
                options: {
                    data: {
                        first_name: signupData.firstName,
                        last_name: signupData.lastName,
                        phone: signupData.phone,
                        role: 'buyer',
                    },
                },
            });

            if (error) throw new Error(error.message);
            if (!data.user) throw new Error('Signup failed. Please try again.');
            
            userId = data.user.id;
        } else {
            // Fallback for testing or if auth state is somehow different
             const { user } = useAuthStore.getState();
             if (!user) throw new Error('No signup data found.');
             userId = user.id;
        }

        // 2. Save Address for the new user
        await addressService.createAddress(userId, newAddress);

        Alert.alert('Success', 'Welcome to BazaarX!', [
            {
                text: 'Get Started',
                onPress: () => {
                     navigation.reset({
                        index: 0,
                        routes: [{ name: 'MainTabs' }],
                    });
                }
            }
        ]);

    } catch (error: any) {
      console.error('Error completing setup:', error);
      Alert.alert('Error', error.message || 'Failed to complete signup.');
    } finally {
        setIsSaving(false);
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <View style={styles.header}>
            <Text style={styles.title}>Where should we deliver?</Text>
            <Text style={styles.subtitle}>Add your primary delivery address.</Text>
        </View>

        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* --- LIVE MAP PREVIEW --- */}
                <Text style={styles.inputLabel}>Pin Location</Text>
                <View style={styles.mapPreviewWrapper}>
                    <MapView
                        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                        style={styles.mapPreview}
                        region={mapRegion}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                    >
                        {newAddress.coordinates && (
                        <Marker coordinate={newAddress.coordinates} />
                        )}
                    </MapView>

                    {isGeocoding && (
                        <View style={styles.mapLoadingOverlay}>
                        <ActivityIndicator color="#FF6A00" />
                        <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>Locating...</Text>
                        </View>
                    )}

                    <View style={styles.mapOverlay}>
                        <Pressable style={styles.editPinButton} onPress={handleOpenMap}>
                        <Move size={14} color="#FFF" />
                        <Text style={styles.editPinText}>Adjust Pin</Text>
                        </Pressable>
                    </View>
                </View>

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

                {/* Location Details */}
                <Text style={styles.inputLabel}>Unit / House No. / Street</Text>
                <TextInput
                    value={newAddress.street}
                    onChangeText={(t) => setNewAddress({ ...newAddress, street: t })}
                    onEndEditing={onStreetBlur}
                    style={styles.input}
                    placeholder="123 Acacia St."
                />

                <Dropdown label="Region" type="region" value={newAddress.region} list={regionList} />
                <Dropdown label="Province" type="province" value={newAddress.province} list={provinceList} disabled={!newAddress.region} />
                <Dropdown label="City / Municipality" type="city" value={newAddress.city} list={cityList} disabled={!newAddress.province} />
                <Dropdown label="Barangay" type="barangay" value={newAddress.barangay} list={barangayList} disabled={!newAddress.city} />




                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Label this address</Text>
                <View style={styles.labelChips}>
                    {['Home', 'Office'].map(l => (
                         <Pressable 
                            key={l}
                            style={[
                                styles.chip,
                                newAddress.label === l && styles.chipActive
                            ]}
                            onPress={() => setNewAddress({...newAddress, label: l})}
                         >
                            <Text style={[styles.chipText, newAddress.label === l && styles.chipTextActive]}>{l}</Text>
                         </Pressable>
                    ))}
                     <TextInput 
                        value={newAddress.label} 
                        onChangeText={(t) => setNewAddress({ ...newAddress, label: t })} 
                        style={[styles.input, { marginBottom: 0, flex: 1, height: 36, paddingVertical: 0 }]} 
                        placeholder="Other..." 
                    />
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Postal Code</Text>
                <TextInput value={newAddress.zipCode} onChangeText={(t) => setNewAddress({ ...newAddress, zipCode: t })} style={styles.input} placeholder="1000" keyboardType="number-pad" />
                
                <View style={{height: 100}} /> 
            </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
            <Pressable 
                style={[styles.button, isSaving && styles.buttonDisabled]} 
                onPress={handleFinish}
                disabled={isSaving}
            >
                {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.buttonText}>Finish Setup</Text>
                        <ArrowRight size={20} color="#FFF" />
                    </View>
                )}
            </Pressable>
        </View>

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
                <View style={styles.mapFooter}>
                    <Text style={styles.mapInstruction}>Drag map to pin exact location</Text>
                    <Pressable style={styles.confirmButton} onPress={handleConfirmLocation}>
                        <Text style={styles.confirmButtonText}>Confirm Pin</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  scrollContent: {
      padding: 24,
  },
  footer: {
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
  },
  button: {
    backgroundColor: '#FF6A00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Form Styles copy-pasted mostly
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  input: { height: 44, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: '#1F2937', backgroundColor: '#FFFFFF', marginBottom: 16 },
  
  typeSelectorContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  typeOptionActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  typeOptionText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeOptionTextActive: { color: '#111827' },

  // Dropdown
  dropdownTrigger: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  dropdownActive: { borderColor: '#FF6A00' },
  dropdownDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  dropdownText: { fontSize: 14, color: '#1F2937', flex: 1, marginRight: 8 },
  placeholderText: { color: '#9CA3AF' },
  dropdownListContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8, marginBottom: 16, backgroundColor: '#FFFFFF', maxHeight: 250, overflow: 'hidden' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8 },
  searchInput: { flex: 1, height: 36, fontSize: 14, color: '#1F2937' },
  selectList: { backgroundColor: '#FFFFFF' },
  selectItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  selectItemText: { fontSize: 14, color: '#111827' },

  // Map
  mapPreviewWrapper: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4, backgroundColor: '#F3F4F6' },
  mapPreview: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 12, right: 12 },
  editPinButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  editPinText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  centerMarkerContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, alignItems: 'center', justifyContent: 'center' },
  markerShadow: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.3)', transform: [{ scaleX: 2 }] },
  mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  mapInstruction: { fontSize: 14, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  confirmButton: { backgroundColor: '#FF6A00', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  
  labelChips: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#FFF7ED', borderColor: '#FF6A00' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FF6A00' },

});
