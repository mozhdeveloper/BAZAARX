/**
 * AddressFormModal.tsx
 *
 * Shared add/edit address form used by both:
 *  - AddressesScreen (My Addresses — profile)
 *  - CheckoutScreen (Add New Address / Fix Address)
 *
 * Props:
 *  visible         — controls Modal visibility
 *  onClose         — called when user taps X or cancels
 *  onSaved(addr)   — called after address is successfully saved; receives the saved Address
 *  initialData     — if editing, pass the existing Address; null/undefined = new address
 *  userId          — required to save to DB
 *  existingCount   — number of already-saved addresses (used to default isDefault=true when 0)
 *  context         — 'buyer' | 'seller'; buyer hides isPickup/isReturn toggles
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, Modal, ScrollView, TextInput, Pressable,
    ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Alert, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import {
    X, ChevronLeft, ChevronDown, ChevronUp,
    Home, Building2, Move, MapPin, Navigation,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { regions, provinces, cities, barangays } from 'select-philippines-address';
import { COLORS } from '@/constants/theme';
import { addressService, type Address } from '@/services/addressService';
import { useAuthStore } from '@/stores/authStore';
import { useAddressForm, coordsInMetroManila, reverseGeoMatchesMetroManila } from '@/hooks/useAddressForm';
import { useGeoLocation, type GeoCascadeResult } from '@/hooks/useGeoLocation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddressFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSaved: (address: Address) => void | Promise<void>;
    initialData?: Partial<Address> | Record<string, any> | null;
    userId: string;
    existingCount?: number;
    /** 'buyer' hides isPickup / isReturn toggles. Default: 'buyer' */
    context?: 'buyer' | 'seller';
    readOnly?: boolean;
    lockName?: boolean; // Locks only the name fields post-checkout
    isOrderEdit?: boolean; // Bypasses DB save and duplicate checks
    /**
     * When true the form opens in pure-create mode:
     *  - The "Saved Addresses" quick-fill strip is hidden
     *  - State is always blank (no prefill from existing records)
     *  - The save path always calls INSERT, never UPSERT
     * Defaults to `!initialData` when omitted.
     */
    forceCreateMode?: boolean;
}

const DEFAULT_REGION: Region = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
};

const makeBlank = (
    userFirstName: string,
    userLastName: string,
    userPhone: string,
    isFirstAddress: boolean,
): Omit<Address, 'id'> => ({
    label: '',
    firstName: userFirstName,
    lastName: userLastName,
    phone: userPhone,
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    zipCode: '',
    landmark: '',
    deliveryInstructions: '',
    addressType: 'residential',
    isDefault: isFirstAddress,
    isPickup: false,
    isReturn: false,
    coordinates: null,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddressFormModal({
    visible,
    onClose,
    onSaved,
    initialData,
    userId,
    existingCount = 0,
    context = 'buyer',
    readOnly = false,
    lockName = false,
    isOrderEdit = false,
    forceCreateMode,
}: AddressFormModalProps) {
    const insets = useSafeAreaInsets();
    const isMounted = useRef(true);

    // Derive whether we are in "add new" vs "edit" mode.
    // forceCreateMode prop wins; otherwise fall back to !initialData.
    const isCreateMode = forceCreateMode ?? !initialData;

    // Form state
    const [form, setForm] = useState<Omit<Address, 'id'>>(
        makeBlank('', '', '', existingCount === 0),
    );
    const [geoCodes, setGeoCodes] = useState<{
        regionCode?: string;
        provinceCode?: string;
        cityCode?: string;
        barangayCode?: string;
    }>({});
    const [isSaving, setIsSaving] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
    const [isLoadingSavedData, setIsLoadingSavedData] = useState(false);
    // Metro Manila smart-lock
    const [isMetroManilaLocked, setIsMetroManilaLocked] = useState(false);

    const { checkDuplicate, checkLabelDuplicate } = useAddressForm();

    // ─── Optimised Geolocation Hook ──────────────────────────────────────────
    // Applies patterns from MOBILE_PERFORMANCE_OPTIMIZATION.md:
    //  • §2B  Parallel fetch — Nominatim + PH regions run concurrently
    //  • §2A  Parallel cities — Metro Manila province cities via Promise.all
    //  • SWR  3-minute GPS cache prevents redundant high-accuracy pings
    //  • Accuracy ladder — Balanced fix first, high-accuracy upgrade in BG
    //  • AbortController — stale requests cancelled on unmount / re-trigger
    const applyCascade = useCallback((cascade: GeoCascadeResult) => {
        if (!isMounted.current) return;

        setIsMetroManilaLocked(cascade.isMetroManila);

        setForm(prev => ({
            ...prev,
            street: cascade.nominatim.street || prev.street,
            barangay: cascade.barangayName ?? cascade.nominatim.barangay,
            city: cascade.cityName ?? cascade.nominatim.city,
            province: cascade.isMetroManila ? 'Metro Manila' : (cascade.provinceName ?? cascade.nominatim.province),
            region: cascade.regionName || cascade.nominatim.region,
            zipCode: cascade.nominatim.zipCode || prev.zipCode,
        }));

        setGeoCodes(prev => ({
            ...prev,
            regionCode: cascade.regionCode,
            ...(cascade.provinceCode && { provinceCode: cascade.provinceCode }),
            ...(cascade.cityCode && { cityCode: cascade.cityCode }),
            ...(cascade.barangayCode && { barangayCode: cascade.barangayCode }),
        }));

        if (cascade.provinceList.length) setProvinceList(cascade.provinceList);
        if (cascade.cityList.length) setCityList(cascade.cityList);
        if (cascade.barangayList.length) setBarangayList(cascade.barangayList);
    }, []);

    const { requestLocation, geocodeCoords, cancelAll } = useGeoLocation({
        onFastFix: (lat, lng) => {
            if (!isMounted.current) return;
            setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng } }));
            setMapRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
        },
        onGeoCascadeComplete: (cascade) => {
            if (!isMounted.current) return;
            applyCascade(cascade);
            setIsReverseGeocoding(false);
        },
        onAccuracyUpgrade: (lat, lng) => {
            if (!isMounted.current) return;
            setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng } }));
            setMapRegion(prev => ({ ...prev, latitude: lat, longitude: lng }));
        },
        setIsGettingLocation: (v) => { if (isMounted.current) setIsGettingLocation(v); },
        setIsReverseGeocoding: (v) => { if (isMounted.current) setIsReverseGeocoding(v); },
    });

    // Cancel in-flight geocoding when the modal closes
    useEffect(() => { if (!visible) cancelAll(); }, [visible, cancelAll]);

    // Dropdown state
    const [regionList, setRegionList] = useState<any[]>([]);
    const [provinceList, setProvinceList] = useState<any[]>([]);
    const [cityList, setCityList] = useState<any[]>([]);
    const [barangayList, setBarangayList] = useState<any[]>([]);
    const [openDropdown, setOpenDropdown] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Map state
    const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
    const [showMapModal, setShowMapModal] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Phone validation helper
    const PH_PHONE_RE = /^(09|\+639)\d{9}$/;
    const phoneError = form.phone.length > 0 && !PH_PHONE_RE.test(form.phone.trim());

    const handlePhoneChange = useCallback((text: string) => {
        // Allow + only at the start, then digits only
        let cleaned = text.replace(/[^\d+]/g, '');
        // Ensure + only appears at position 0
        if (cleaned.indexOf('+') > 0) {
            cleaned = cleaned.replace(/\+/g, '');
        }
        // Max length: +639XXXXXXXXX = 13 chars, 09XXXXXXXXX = 11 chars
        const maxLen = cleaned.startsWith('+') ? 13 : 11;
        cleaned = cleaned.slice(0, maxLen);
        setForm(prev => ({ ...prev, phone: cleaned }));
    }, []);

    // Mount guard
    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    // Load regions once
    useEffect(() => {
        if (regionList.length === 0) {
            regions().then(r => { if (isMounted.current) setRegionList(r); });
        }
    }, []);

    // Populate form when modal opens
    useEffect(() => {
        if (!visible) return;
        if (initialData) {
            // Editing mode — pre-fill with existing address
            const initialRecord = initialData as Record<string, any>;
            const { id: _ignoredId, ...initialWithoutId } = initialRecord;

            setForm({
                ...makeBlank('', '', '', existingCount === 0),
                ...initialWithoutId,
                coordinates: initialWithoutId.coordinates ?? null,
            });

            setSelectedSavedAddressId(typeof initialRecord.id === 'string' ? initialRecord.id : null);
            setGeoCodes({
                regionCode: initialRecord.regionCode,
                provinceCode: initialRecord.provinceCode,
                cityCode: initialRecord.cityCode,
                barangayCode: initialRecord.barangayCode,
            });
            if (initialRecord.coordinates) {
                setMapRegion({
                    latitude: initialRecord.coordinates.latitude,
                    longitude: initialRecord.coordinates.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            } else {
                setMapRegion(DEFAULT_REGION);
            }
        } else {
            // Add mode — blank form
            const authUser = useAuthStore.getState().user;
            const fullName = (authUser?.name || '').trim();
            const nameParts = fullName.length > 0 ? fullName.split(/\s+/) : [];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ');
            setForm(makeBlank(firstName, lastName, authUser?.phone || '', existingCount === 0));
            setSelectedSavedAddressId(null);
            setGeoCodes({});
            setProvinceList([]);
            setCityList([]);
            setBarangayList([]);
            setMapRegion(DEFAULT_REGION);
            // Always reset Metro Manila lock for a fresh entry.
            setIsMetroManilaLocked(false);
        }
        setOpenDropdown(null);
    }, [visible, initialData]);

    const applySavedAddress = useCallback((address: Address) => {
        setForm(prev => ({
            ...prev,
            label: address.label || prev.label,
            firstName: address.firstName || prev.firstName,
            lastName: address.lastName || prev.lastName,
            phone: address.phone || prev.phone,
            street: address.street || prev.street,
            barangay: address.barangay || prev.barangay,
            city: address.city || prev.city,
            province: address.province || prev.province,
            region: address.region || prev.region,
            zipCode: address.zipCode || prev.zipCode,
            landmark: address.landmark || prev.landmark,
            deliveryInstructions: address.deliveryInstructions || prev.deliveryInstructions,
            addressType: address.addressType || prev.addressType,
            coordinates: address.coordinates || prev.coordinates,
        }));

        setGeoCodes({
            regionCode: address.regionCode,
            provinceCode: address.provinceCode,
            cityCode: address.cityCode,
            barangayCode: address.barangayCode,
        });

        if (address.coordinates?.latitude != null && address.coordinates?.longitude != null) {
            setMapRegion({
                latitude: address.coordinates.latitude,
                longitude: address.coordinates.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            });
        }
    }, []);

    useEffect(() => {
        if (!visible || !userId) return;

        const loadSavedData = async () => {
            setIsLoadingSavedData(true);
            try {
                const authUser = useAuthStore.getState().user;
                const addresses = await addressService.getAddresses(userId);
                if (!isMounted.current) return;

                // Always load the list so duplicate-checks work.
                setSavedAddresses(addresses || []);

                // --- FRESH ENTRY LOGIC ---
                // In ADD mode, NEVER auto-apply a saved address to the form.
                // Only fill contact details from the user's profile so the
                // name/phone fields aren't blank, but leave all location fields
                // empty so the user consciously types a new address.
                if (!initialData && authUser) {
                    const fullName = (authUser.name || '').trim();
                    const nameParts = fullName.length > 0 ? fullName.split(/\s+/) : [];
                    setForm(prev => ({
                        ...prev,
                        firstName: prev.firstName || nameParts[0] || '',
                        lastName: prev.lastName || nameParts.slice(1).join(' ') || '',
                        phone: prev.phone || authUser.phone || '',
                    }));
                }
                // In EDIT mode, initialData already populated the form via the
                // earlier useEffect — nothing extra needed here.
            } catch (error) {
                console.error('[AddressFormModal] Failed to load saved profile/address data:', error);
            } finally {
                if (isMounted.current) setIsLoadingSavedData(false);
            }
        };

        loadSavedData();
    }, [visible, userId, initialData]);

    // ---------------------------------------------------------------------------
    // Geocoding helpers
    // ---------------------------------------------------------------------------

    const attemptForwardGeocode = async (override?: Partial<Omit<Address, 'id'>>) => {
        const current = { ...form, ...override };
        const parts = [current.street, current.barangay, current.city, current.province, 'Philippines'].filter(Boolean);
        if (parts.length < 3) return;
        if (!isMounted.current) return;
        setIsGeocoding(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(parts.join(', '))}&limit=1`,
                { headers: { 'User-Agent': 'BazaarXApp/1.0' } },
            );
            const data = await res.json();
            if (data?.length > 0 && isMounted.current) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng } }));
                setMapRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            }
        } catch { /* silent */ } finally {
            if (isMounted.current) setIsGeocoding(false);
        }
    };

    /**
     * reverseGeocodeAndFill — now delegates to the optimised useGeoLocation hook.
     * Called when the user confirms a map pin (not a GPS request).
     * Uses the hook's geocodeCoords() path:
     *  - Nominatim result is cached by rounded coord key (no duplicate API calls)
     *  - PH regions list is pre-warmed in parallel
     *  - Metro Manila city fetches run concurrently via Promise.all (§2A)
     */
    const reverseGeocodeAndFill = useCallback((lat: number, lng: number) => {
        setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng } }));
        geocodeCoords(lat, lng);
    }, [geocodeCoords]);
    // ---------------------------------------------------------------------------
    // Dropdown cascade handlers

    // ---------------------------------------------------------------------------

    const toggleDropdown = (name: typeof openDropdown) => {
        if (openDropdown === name) { setOpenDropdown(null); }
        else { setOpenDropdown(name); }
    };

    const handleDropdownFieldChange = useCallback((type: NonNullable<typeof openDropdown>, text: string) => {
        if (type === 'region') {
            setForm(prev => ({ ...prev, region: text, province: '', city: '', barangay: '', coordinates: null }));
            setGeoCodes(prev => ({ ...prev, regionCode: undefined, provinceCode: undefined, cityCode: undefined, barangayCode: undefined }));
            setCityList([]);
            setBarangayList([]);
            return;
        }

        if (type === 'province') {
            setForm(prev => ({ ...prev, province: text, city: '', barangay: '', coordinates: null }));
            setGeoCodes(prev => ({ ...prev, provinceCode: undefined, cityCode: undefined, barangayCode: undefined }));
            setBarangayList([]);
            return;
        }

        if (type === 'city') {
            setForm(prev => ({ ...prev, city: text, barangay: '', coordinates: null }));
            setGeoCodes(prev => ({ ...prev, cityCode: undefined, barangayCode: undefined }));
            return;
        }

        setForm(prev => ({ ...prev, barangay: text }));
        setGeoCodes(prev => ({ ...prev, barangayCode: undefined }));
    }, []);

    const onRegionChange = async (code: string) => {
        const name = regionList.find((r: any) => r.region_code === code)?.region_name || '';
        setForm(prev => ({ ...prev, region: name, province: '', city: '', barangay: '', coordinates: null }));
        setGeoCodes({ regionCode: code });
        setOpenDropdown(null);
        setIsLoadingLocation(true);
        const provs = await provinces(code);
        if (!isMounted.current) return;
        setProvinceList(provs);
        setCityList([]);
        setBarangayList([]);
        setIsLoadingLocation(false);
    };

    const onProvinceChange = async (code: string) => {
        const name = provinceList.find((p: any) => p.province_code === code)?.province_name || '';
        setForm(prev => ({ ...prev, province: name, city: '', barangay: '', coordinates: null }));
        setGeoCodes(prev => ({ ...prev, provinceCode: code, cityCode: undefined, barangayCode: undefined }));
        setOpenDropdown(null);
        setIsLoadingLocation(true);
        const cts = await cities(code);
        if (!isMounted.current) return;
        setCityList(cts);
        setBarangayList([]);
        setIsLoadingLocation(false);
    };

    const onCityChange = async (code: string) => {
        const name = cityList.find((c: any) => c.city_code === code)?.city_name || '';
        setForm(prev => ({ ...prev, city: name, barangay: '', coordinates: null }));
        setGeoCodes(prev => ({ ...prev, cityCode: code, barangayCode: undefined }));
        setOpenDropdown(null);
        setIsLoadingLocation(true);
        const bList = await barangays(code);
        if (!isMounted.current) return;
        setBarangayList(bList);
        setIsLoadingLocation(false);
        attemptForwardGeocode({ city: name, barangay: '' });
    };

    const onBarangayChange = (name: string, brgyCode?: string) => {
        setForm(prev => ({ ...prev, barangay: name }));
        if (brgyCode) setGeoCodes(prev => ({ ...prev, barangayCode: brgyCode }));
        setOpenDropdown(null);
        attemptForwardGeocode({ barangay: name });
    };

    const onStreetBlur = () => {
        if (form.street.length > 3) attemptForwardGeocode();
    };

    // ---------------------------------------------------------------------------
    // Map confirm — pin → reverse geocode → fill fields
    // ---------------------------------------------------------------------------

    const handleConfirmPin = () => {
        const lat = mapRegion.latitude;
        const lng = mapRegion.longitude;
        setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng } }));
        setShowMapModal(false);
        reverseGeocodeAndFill(lat, lng);
    };

    // ---------------------------------------------------------------------------
    // GPS — "Use My Location" — delegates to useGeoLocation hook
    // ---------------------------------------------------------------------------

    const handleUseMyLocation = useCallback(() => {
        // requestLocation() handles:
        //  1. Permission request
        //  2. SWR cache check (3-min TTL)
        //  3. Fast balanced GPS fix → onFastFix updates map immediately
        //  4. Nominatim + PH regions fetched in parallel
        //  5. Background high-accuracy upgrade (non-blocking)
        requestLocation();
    }, [requestLocation]);

    // ---------------------------------------------------------------------------
    // Save
    // ---------------------------------------------------------------------------

    const handleSave = async () => {
        if (!userId) return;

        // --- QUICK-FILL BYPASS ---
        // If editing an order, just pass the form data back to the order and close.
        // Do NOT save it to the global address book to avoid duplicate errors!
        if (isOrderEdit) {
            setIsSaving(true);
            try {
                await (onSaved(form as Address) as Promise<void> | void);
                if (isMounted.current) onClose();
            } catch (error: any) {
                console.error('[AddressFormModal] Save error:', error);
                Alert.alert('Update Failed', error?.message || 'Could not save address changes. Please try again.');
            } finally {
                if (isMounted.current) setIsSaving(false);
            }
            return;
        }

        // --- DUPLICATE CHECKS ---
        // 1. Duplicate Label Check
        if (form.label && form.label.trim().length > 0) {
            const conflictingLabel = checkLabelDuplicate(form.label, {
                existingAddresses: savedAddresses,
                editingId: initialData?.id as string | null,
            });
            if (conflictingLabel) {
                Alert.alert(
                    'Label Already Exists',
                    `You already have a saved address with the label "${form.label.trim()}". Please choose a different name.`,
                );
                return;
            }
        }

        // 2. Duplicate Location Check (Street + City + Province)
        // Province is included so that e.g. "123 Rizal St, San Pedro, Laguna"
        // is NOT flagged as a duplicate of "123 Rizal St, San Pedro, Metro Manila".
        const { isDuplicate, conflicting: duplicateLocation } = checkDuplicate(
            { street: form.street, city: form.city, province: form.province },
            { existingAddresses: savedAddresses, editingId: initialData?.id as string | null },
        );

        if (isDuplicate && duplicateLocation) {
            Alert.alert(
                'Address Already Exists',
                `This exact location (street, city, and province) is already saved in your address book${duplicateLocation.label ? ` under "${duplicateLocation.label}"` : ''}. Please edit that entry instead of creating a duplicate.`,
            );
            return;
        }

        setIsSaving(true);
        // ... rest of the save payload ...
        try {
            const payload = {
                ...form,
                barangayCode: geoCodes.barangayCode,
                cityCode: geoCodes.cityCode,
                provinceCode: geoCodes.provinceCode,
                regionCode: geoCodes.regionCode,
            };

            let saved: Address;
            if (initialData?.id) {
                saved = await addressService.updateAddress(userId, initialData.id, payload);
            } else {
                saved = await addressService.createAddress(userId, payload);
            }

            if (isMounted.current) {
                onSaved(saved);
                onClose();
            }
        } catch (error) {
            console.error('[AddressFormModal] Save error:', error);
        } finally {
            if (isMounted.current) setIsSaving(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Dropdown sub-component
    // ---------------------------------------------------------------------------

    const renderDropdown = ({ label, type, value, list, disabled = false }: {
        label: string; type: NonNullable<typeof openDropdown>; value: string; list: any[]; disabled?: boolean;
    }) => {
        const isOpen = openDropdown === type;
        const normalizedQuery = (value || '').trim().toLowerCase();
        const filtered = list.filter((item: any) => {
            const name = item.region_name || item.province_name || item.city_name || item.brgy_name || '';
            return name.toLowerCase().includes(normalizedQuery);
        });

        return (
            <View style={{ marginBottom: 12, zIndex: isOpen ? 100 : 1 }}>
                <Text style={s.inputLabel}>{label}</Text>
                <View style={[s.dropdownTrigger, disabled && s.dropdownDisabled, isOpen && s.dropdownActive]}>
                    <TextInput
                        style={[s.dropdownTextInput, disabled && { color: '#9CA3AF' }]}
                        placeholder="Select..."
                        placeholderTextColor="#9CA3AF"
                        value={value}
                        editable={!disabled}
                        onFocus={() => !disabled && setOpenDropdown(type)}
                        onChangeText={(text) => {
                            if (!disabled) {
                                if (openDropdown !== type) setOpenDropdown(type);
                                handleDropdownFieldChange(type, text);
                            }
                        }}
                    />
                    <Pressable
                        onPress={() => !disabled && toggleDropdown(type)}
                        disabled={disabled}
                        hitSlop={8}
                        style={{ paddingVertical: 4, paddingLeft: 8 }}
                    >
                        {isLoadingLocation && isOpen
                            ? <ActivityIndicator size="small" color={COLORS.primary} />
                            : isOpen
                                ? <ChevronUp size={20} color={disabled ? '#9CA3AF' : '#4B5563'} />
                                : <ChevronDown size={20} color={disabled ? '#9CA3AF' : '#4B5563'} />
                        }
                    </Pressable>
                </View>
                {isOpen && (
                    <View style={s.dropdownList}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {filtered.map((item: any, i: number) => {
                                const name = item.region_name || item.province_name || item.city_name || item.brgy_name || '';
                                return (
                                    <Pressable
                                        key={`${type}-${i}`}
                                        style={({ pressed }) => [s.selectItem, pressed && { backgroundColor: '#FFF7ED' }]}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            if (type === 'region') onRegionChange(item.region_code);
                                            else if (type === 'province') onProvinceChange(item.province_code);
                                            else if (type === 'city') onCityChange(item.city_code);
                                            else onBarangayChange(item.brgy_name, item.brgy_code);
                                        }}
                                    >
                                        <Text style={s.selectItemText}>{name}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    // ---------------------------------------------------------------------------
    // Toggle row helper
    // ---------------------------------------------------------------------------

    const Toggle = ({
        value, onToggle, label, activeColor = '#16A34A', activeBg = '#DCFCE7',
    }: { value: boolean; onToggle: () => void; label: string; activeColor?: string; activeBg?: string }) => (
        <Pressable
            style={[s.checkboxRow, value && { backgroundColor: activeBg }]}
            onPress={onToggle}
        >
            <View style={[s.checkbox, value && { borderColor: activeColor, backgroundColor: activeColor }]}>
                {value && <View style={{ width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4 }} />}
            </View>
            <Text style={[s.checkboxText, value && { color: activeColor }]}>{label}</Text>
        </Pressable>
    );

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <>
            {/* --- MAIN FORM MODAL --- */}
            <Modal
                visible={visible && !showMapModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={onClose}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#FFF' }}>
                    {/* Header */}
                    <View style={[s.header, { paddingTop: insets.top > 0 ? insets.top : 20 }]}>
                        <Text style={s.headerTitle}>{!isCreateMode ? 'Edit Address' : 'Add Address'}</Text>
                        <Pressable onPress={onClose} style={s.closeBtn}>
                            <X size={22} color="#1F2937" />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

                        {isLoadingSavedData && (
                            <View style={s.prefillLoadingRow}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={s.prefillLoadingText}>Loading saved profile and addresses...</Text>
                            </View>
                        )}

                        {/* Address type selector */}
                        {!readOnly ? (
                            <View style={s.typeRow}>
                                <Pressable
                                    style={[s.typeOption, form.addressType === 'residential' && s.typeOptionActive]}
                                    onPress={() => setForm(prev => ({ ...prev, addressType: 'residential' }))}
                                >
                                    <Home size={16} color={form.addressType === 'residential' ? COLORS.primary : '#6B7280'} />
                                    <Text style={[s.typeOptionText, form.addressType === 'residential' && s.typeOptionTextActive]}>Residential</Text>
                                </Pressable>
                                <Pressable
                                    style={[s.typeOption, form.addressType === 'commercial' && s.typeOptionActive]}
                                    onPress={() => setForm(prev => ({ ...prev, addressType: 'commercial' }))}
                                >
                                    <Building2 size={16} color={form.addressType === 'commercial' ? COLORS.primary : '#6B7280'} />
                                    <Text style={[s.typeOptionText, form.addressType === 'commercial' && s.typeOptionTextActive]}>Commercial</Text>
                                </Pressable>
                            </View>
                        ) : (
                           <Text style={[s.inputLabel, { color: COLORS.primary, marginBottom: 16 }]}>
                               Address Type: {form.addressType === 'residential' ? 'Residential' : 'Commercial'}
                           </Text>
                        )}

                        {/* Saved Addresses quick-fill strip.
                         * HIDDEN in create mode — showing saved chips in "Add New"
                         * would confuse users into thinking they are editing an
                         * existing record. Only shown when explicitly editing. */}
                        {!readOnly && !isCreateMode && savedAddresses.length > 0 && (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={s.inputLabel}>Saved Addresses</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.savedAddressRow}>
                                    {savedAddresses.map((addr) => {
                                        const isActive = selectedSavedAddressId === addr.id;
                                        return (
                                            <Pressable
                                                key={addr.id}
                                                style={[s.savedAddressChip, isActive && s.savedAddressChipActive]}
                                                onPress={() => {
                                                    if (isActive) {
                                                        setSelectedSavedAddressId(null);
                                                        if (initialData) {
                                                            const initialRecord = initialData as Record<string, any>;
                                                            const { id: _ignoredId, ...initialWithoutId } = initialRecord;
                                                            setForm({
                                                                ...makeBlank('', '', '', existingCount === 0),
                                                                ...initialWithoutId,
                                                                coordinates: initialWithoutId.coordinates ?? null,
                                                            });
                                                            setGeoCodes({
                                                                regionCode: initialRecord.regionCode,
                                                                provinceCode: initialRecord.provinceCode,
                                                                cityCode: initialRecord.cityCode,
                                                                barangayCode: initialRecord.barangayCode,
                                                            });
                                                        } else {
                                                            const authUser = useAuthStore.getState().user;
                                                            const fullName = (authUser?.name || '').trim();
                                                            const nameParts = fullName.length > 0 ? fullName.split(/\s+/) : [];
                                                            setForm(makeBlank(nameParts[0] || '', nameParts.slice(1).join(' '), authUser?.phone || '', existingCount === 0));
                                                            setGeoCodes({});
                                                        }
                                                    } else {
                                                        setSelectedSavedAddressId(addr.id);
                                                        applySavedAddress(addr);
                                                    }
                                                }}
                                            >
                                                <Text style={[s.savedAddressChipText, isActive && s.savedAddressChipTextActive]}>
                                                    {addr.label || 'Saved Address'}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Create-mode hint banner — only shown when adding a brand-new address */}
                        {!readOnly && isCreateMode && savedAddresses.length > 0 && (
                            <View style={s.createModeBanner}>
                                <Text style={s.createModeBannerText}>
                                    ✦ Fill in the fields below to add a new address. It will be saved separately from your existing ones.
                                </Text>
                            </View>
                        )}

                        {/* Contact info */}
                        <Text style={s.sectionHeader}>Contact Information</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.inputLabel}>First Name</Text>
                                <TextInput editable={!readOnly} value={form.firstName} onChangeText={t => setForm(prev => ({ ...prev, firstName: t }))} style={[s.input, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]} placeholder="John" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.inputLabel}>Last Name</Text>
                                <TextInput editable={!readOnly} value={form.lastName} onChangeText={t => setForm(prev => ({ ...prev, lastName: t }))} style={[s.input, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]} placeholder="Doe" />
                            </View>
                        </View>
                        <Text style={s.inputLabel}>Phone Number</Text>
                        <TextInput
                            editable={!readOnly}
                            value={form.phone}
                            onChangeText={handlePhoneChange}
                            style={[s.input, phoneError && s.inputError, { marginBottom: phoneError ? 4 : 16 }, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]}
                            placeholder="09XXXXXXXXX"
                            keyboardType="phone-pad"
                            maxLength={13}
                        />
                        {phoneError && !readOnly && (
                            <Text style={s.fieldError}>Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX)</Text>
                        )}

                        {/* Location details */}
                        <Text style={[s.sectionHeader, { marginTop: 12 }]}>Location Details</Text>

                        {!readOnly && (
                            <>
                                <Text style={s.inputLabel}>Pin Location</Text>
                                <Pressable
                                    style={[s.useLocationBtn, isGettingLocation && { opacity: 0.7 }]}
                                    onPress={handleUseMyLocation}
                                    disabled={isGettingLocation}
                                >
                                    {isGettingLocation ? (
                                        <>
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                            <Text style={s.useLocationText}>Getting your location…</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Navigation size={16} color={COLORS.primary} />
                                            <Text style={s.useLocationText}>Use My Current Location</Text>
                                        </>
                                    )}
                                </Pressable>
                            </>
                        )}

                        <View style={s.mapWrapper}>
                            <MapView
                                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                                style={s.mapPreview}
                                region={mapRegion}
                                scrollEnabled={true} // Allows user to pan/drag the map
                                zoomEnabled={true}   // Allows user to pinch-to-zoom
                                rotateEnabled={false}
                                pitchEnabled={false}
                            >
                                {form.coordinates && <Marker coordinate={form.coordinates} />}
                            </MapView>
                            
                            {(isGeocoding || isReverseGeocoding) && (
                                <View style={s.mapLoadingOverlay}>
                                    <ActivityIndicator color={COLORS.primary} />
                                    <Text style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>
                                        {isReverseGeocoding ? 'Reading location...' : 'Locating...'}
                                    </Text>
                                </View>
                            )}

                            {!readOnly && (
                                <View style={s.mapOverlay}>
                                    <Pressable style={s.adjustPinBtn} onPress={() => setShowMapModal(true)}>
                                        <Move size={14} color="#FFF" />
                                        <Text style={s.adjustPinText}>Adjust Pin</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        <Text style={[s.inputLabel, { marginTop: 12 }]}>Label</Text>
                        <TextInput editable={!readOnly} value={form.label} onChangeText={t => setForm(prev => ({ ...prev, label: t }))} style={[s.input, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]} placeholder="Home, Office..." />

                        {renderDropdown({ label: 'Region', type: 'region', value: form.region, list: regionList, disabled: readOnly })}

                        {/* Province: locked when Metro Manila detected via GPS/pin — prevents user error. */}
                        {isMetroManilaLocked && !readOnly ? (
                            <View style={{ marginBottom: 12 }}>
                                <Text style={s.inputLabel}>Province</Text>
                                <View style={[s.dropdownTrigger, s.dropdownDisabled, { justifyContent: 'space-between' }]}>
                                    <Text style={[s.dropdownTextInput, { color: '#1F2937' }]}>Metro Manila</Text>
                                    <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 11, color: COLORS.primary, fontWeight: '700' }}>Auto-detected</Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, marginBottom: 12 }}>
                                    Province locked to Metro Manila based on your pinned location.
                                </Text>
                            </View>
                        ) : (
                            renderDropdown({ label: 'Province', type: 'province', value: form.province, list: provinceList, disabled: readOnly || !form.region })
                        )}

                        {renderDropdown({
                            label: 'City / Municipality',
                            type: 'city',
                            value: form.city,
                            list: cityList,
                            disabled: readOnly || (!form.province && !isMetroManilaLocked && !form.region?.toLowerCase().includes('ncr') && !form.region?.toLowerCase().includes('metro manila')),
                        })}
                        {renderDropdown({ label: 'Barangay', type: 'barangay', value: form.barangay, list: barangayList, disabled: readOnly || !form.city })}

                        <Text style={s.inputLabel}>Street / House No.</Text>
                        <TextInput
                            editable={!readOnly}
                            value={form.street}
                            onChangeText={t => setForm(prev => ({ ...prev, street: t }))}
                            onEndEditing={onStreetBlur}
                            style={[s.input, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]}
                            placeholder="123 Acacia St."
                        />

                        {/* Optional fields */}
                        <Text style={[s.inputLabel, { marginTop: 12 }]}>Landmark (Optional)</Text>
                        <TextInput editable={!readOnly} value={form.landmark || ''} onChangeText={t => setForm(prev => ({ ...prev, landmark: t }))} style={[s.input, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]} placeholder="Near 7-Eleven, Colored gate" />

                        <Text style={s.inputLabel}>Delivery Instructions (Optional)</Text>
                        <TextInput
                            editable={!readOnly}
                            value={form.deliveryInstructions || ''}
                            onChangeText={t => setForm(prev => ({ ...prev, deliveryInstructions: t }))}
                            style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]}
                            placeholder="Leave at front desk..."
                            multiline
                        />

                        <Text style={s.inputLabel}>Postal Code</Text>
                        <TextInput editable={!readOnly} value={form.zipCode} onChangeText={t => setForm(prev => ({ ...prev, zipCode: t }))} style={[s.input, readOnly && { backgroundColor: '#F9FAFB', color: '#6B7280' }]} placeholder="1000" keyboardType="number-pad" />

                        {/* Toggles */}
                        {!readOnly && (
                            <Toggle
                                value={form.isDefault}
                                onToggle={() => setForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                                label="Set as default delivery address"
                            />
                        )}

                        {!readOnly && context === 'seller' && (
                            <>
                                <View style={{ height: 8 }} />
                                <Toggle
                                    value={form.isPickup ?? false}
                                    onToggle={() => setForm(prev => ({ ...prev, isPickup: !prev.isPickup }))}
                                    label="Use as pickup / shipping origin address"
                                    activeColor="#2563EB"
                                    activeBg="#DBEAFE"
                                />
                                <View style={{ height: 8 }} />
                                <Toggle
                                    value={form.isReturn ?? false}
                                    onToggle={() => setForm(prev => ({ ...prev, isReturn: !prev.isReturn }))}
                                    label="Use as return address"
                                    activeColor="#7C3AED"
                                    activeBg="#EDE9FE"
                                />
                            </>
                        )}
                    </ScrollView>

                    {/* Sticky footer */}
                    <View style={s.footer}>
                        {!readOnly && context === 'buyer' && initialData && (
                             <Text style={{ fontSize: 12, color: '#D97706', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
                                 Note: Delivery address can only be changed once per order.
                             </Text>
                        )}
                        {readOnly ? (
                            <Pressable style={[s.saveBtn, { backgroundColor: '#4B5563' }]} onPress={onClose}>
                                <Text style={s.saveBtnText}>Close Details</Text>
                            </Pressable>
                        ) : (
                            <Pressable style={[s.saveBtn, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
                                {isSaving
                                    ? <ActivityIndicator color="#FFF" />
                                    : <Text style={s.saveBtnText}>{initialData ? 'Save Changes' : 'Add Address'}</Text>
                                }
                            </Pressable>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- PRECISION MAP MODAL --- */}
            <Modal visible={showMapModal} animationType="slide" onRequestClose={() => setShowMapModal(false)}>
                <View style={{ flex: 1, backgroundColor: '#FFF' }}>
                    <MapView
                        style={{ flex: 1 }}
                        region={mapRegion}
                        onRegionChangeComplete={(r: Region) => setMapRegion(r)}
                        showsUserLocation
                        showsMyLocationButton
                    />

                    {/* Center crosshair marker */}
                    <View style={s.centerMarker} pointerEvents="none">
                        <MapPin size={48} color={COLORS.primary} fill={COLORS.primary} />
                        <View style={s.markerShadow} />
                    </View>

                    {/* Header */}
                    <View style={[s.mapHeader, { paddingTop: insets.top + 10 }]}>
                        <Pressable onPress={() => setShowMapModal(false)} style={s.mapCloseBtn}>
                            <ChevronLeft size={24} color="#1F2937" />
                        </Pressable>
                        <Text style={s.mapTitle}>Adjust Location</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Footer */}
                    <View style={s.mapFooter}>
                        <Text style={s.mapInstruction}>Drag the map to pin your exact location</Text>
                        <Pressable style={s.saveBtn} onPress={handleConfirmPin}>
                            <Text style={s.saveBtnText}>Confirm Pin</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' },

    sectionHeader: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
    input: { height: 44, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, fontSize: 14, color: '#1F2937', backgroundColor: '#FFF', marginBottom: 16 },

    typeRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
    typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
    typeOptionActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    typeOptionText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    typeOptionTextActive: { color: '#111827' },

    dropdownTrigger: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#FFF' },
    dropdownActive: { borderColor: COLORS.primary },
    dropdownDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
    dropdownTextInput: { fontSize: 14, color: '#1F2937', flex: 1, marginRight: 8, paddingVertical: 0 },
    dropdownList: { borderWidth: 1, borderColor: '#E5E7EB', borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginTop: -8, marginBottom: 16, backgroundColor: '#FFF', overflow: 'hidden' },
    selectItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    selectItemText: { fontSize: 14, color: '#111827' },

    mapWrapper: { height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4, backgroundColor: '#F3F4F6' },
    mapPreview: { flex: 1 },
    mapOverlay: { position: 'absolute', bottom: 12, right: 12 },
    adjustPinBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1F2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
    adjustPinText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    mapLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

    mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10, zIndex: 10 },
    mapCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    mapTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
    centerMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -48, alignItems: 'center', justifyContent: 'center' },
    markerShadow: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.3)', transform: [{ scaleX: 2 }] },
    mapFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#FFF', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    mapInstruction: { fontSize: 14, color: '#6B7280', marginBottom: 12 },

    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, marginTop: 8 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    checkboxText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },

    footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF' },
    saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF', padding: -3, paddingLeft: 8, paddingRight: 8},

    // Phone validation
    inputError: { borderColor: '#EF4444' },
    fieldError: { fontSize: 12, color: '#EF4444', marginBottom: 12, marginTop: 0 },

    // Use My Location button
    useLocationBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 16,
        backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA',
        borderRadius: 12, marginBottom: 10,
    },
    useLocationText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

    prefillLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    prefillLoadingText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    savedAddressRow: {
        gap: 8,
        paddingVertical: 2,
        paddingRight: 4,
    },
    savedAddressChip: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    savedAddressChipActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#FFF7ED',
    },
    savedAddressChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },
    savedAddressChipTextActive: {
        color: COLORS.primary,
    },
    // Create-mode hint banner (replaces saved-address chips when forceCreateMode/add mode)
    createModeBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 14,
    },
    createModeBannerText: {
        fontSize: 12,
        color: '#1E40AF',
        fontWeight: '500',
        lineHeight: 18,
        flex: 1,
    },
}); 


