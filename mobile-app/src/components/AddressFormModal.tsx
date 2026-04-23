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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, Modal, ScrollView, TextInput, Pressable, Animated, Easing,
    ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Alert, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import {
    X, ChevronLeft, Search,
    Home, Building2, Move, MapPin, Navigation,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { regions, provinces, cities, barangays } from 'select-philippines-address';
import { COLORS } from '@/constants/theme';
import { addressService, type Address } from '@/services/addressService';

// ---------------------------------------------------------------------------
// Module-level cache — parsed once, reused for the app session
// ---------------------------------------------------------------------------

const _provinceCache = new Map<string, any[]>();
const _cityCache     = new Map<string, any[]>();
const _barangayCache = new Map<string, any[]>();

const getCachedProvinces = async (regionCode: string): Promise<any[]> => {
    if (_provinceCache.has(regionCode)) return _provinceCache.get(regionCode)!;
    const data = await provinces(regionCode);
    _provinceCache.set(regionCode, data);
    return data;
};

const getCachedCities = async (provinceCode: string): Promise<any[]> => {
    if (_cityCache.has(provinceCode)) return _cityCache.get(provinceCode)!;
    const data = await cities(provinceCode);
    _cityCache.set(provinceCode, data);
    return data;
};

const getCachedBarangays = async (cityCode: string): Promise<any[]> => {
    if (_barangayCache.has(cityCode)) return _barangayCache.get(cityCode)!;
    const data = await barangays(cityCode);
    _barangayCache.set(cityCode, data);
    return data;
};

// Island group lookup — module-level so Sets are never re-created
const LUZON_CODES   = new Set(['01', '02', '03', '04', '05', '13', '14', '17']);
const VISAYAS_CODES = new Set(['06', '07', '08']);
const getIslandGroup = (code: string): string => {
    if (LUZON_CODES.has(code))   return 'Luzon';
    if (VISAYAS_CODES.has(code)) return 'Visayas';
    return 'Mindanao';
};


// NCR is province-less in PSGC — we treat "Metro Manila" as a synthetic province
const NCR_REGION_CODE    = '13';
const METRO_MANILA_LABEL = 'Metro Manila';
const isNCR = (code: string) => code === NCR_REGION_CODE;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddressFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSaved: (address: Address) => void;
    initialData?: Address | null;
    userId: string;
    existingCount?: number;
    /** 'buyer' hides isPickup / isReturn toggles. Default: 'buyer' */
    context?: 'buyer' | 'seller';
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
}: AddressFormModalProps) {
    const insets = useSafeAreaInsets();
    const isMounted = useRef(true);

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

    // Dropdown search + debounce state
    const [dropdownSearch, setDropdownSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Dropdown animation
    const dropdownOpacity = useRef(new Animated.Value(0)).current;
    const dropdownSlide = useRef(new Animated.Value(-8)).current;

    useEffect(() => {
        if (openDropdown) {
            dropdownOpacity.setValue(0);
            dropdownSlide.setValue(-8);
            Animated.parallel([
                Animated.timing(dropdownOpacity, { toValue: 1, duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
                Animated.timing(dropdownSlide, { toValue: 0, duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
            ]).start();
        }
    }, [openDropdown]);

    // Island group mapping for region categorization — use module-level constants
    // Phone validation helper
    const PH_PHONE_RE = /^(09|\+639)\d{9}$/;
    const phoneError = form.phone.length > 0 && !PH_PHONE_RE.test(form.phone.trim());

    const handlePhoneChange = useCallback((text: string) => {
        let cleaned = text.replace(/[^\d+]/g, '');
        if (cleaned.indexOf('+') > 0) {
            cleaned = cleaned.replace(/\+/g, '');
        }
        const maxLen = cleaned.startsWith('+') ? 13 : 11;
        cleaned = cleaned.slice(0, maxLen);
        setForm(prev => ({ ...prev, phone: cleaned }));
    }, []);

    // Mount guard + timer cleanup
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
        };
    }, []);

    // Load regions once
    useEffect(() => {
        if (regionList.length === 0) {
            regions().then(r => { if (isMounted.current) setRegionList(r); });
        }
    }, []);

    // Debounce search input for dropdown filtering (300ms)
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearch(dropdownSearch);
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [dropdownSearch]);

    // Reset search when dropdown type changes
    useEffect(() => {
        setDropdownSearch('');
        setDebouncedSearch('');
    }, [openDropdown]);

    // Validate — show error when no matches found after debounce
    useEffect(() => {
        if (!openDropdown || debouncedSearch.length === 0) {
            if (openDropdown) {
                setFieldErrors(prev => { const n = { ...prev }; delete n[openDropdown]; return n; });
            }
            return;
        }
        const currentList = openDropdown === 'region' ? regionList
            : openDropdown === 'province' ? provinceList
                : openDropdown === 'city' ? cityList : barangayList;
        const hasMatch = currentList.some((item: any) => {
            const name = item.region_name || item.province_name || item.city_name || item.brgy_name || '';
            return name.toLowerCase().includes(debouncedSearch.toLowerCase());
        });
        setFieldErrors(prev => {
            const n = { ...prev };
            if (!hasMatch) n[openDropdown] = 'Location not found';
            else delete n[openDropdown];
            return n;
        });
    }, [debouncedSearch, openDropdown, regionList, provinceList, cityList, barangayList]);

    // Populate form when modal opens
    useEffect(() => {
        if (!visible) return;
        if (initialData) {
            setForm({ ...initialData });
            setGeoCodes({
                regionCode: initialData.regionCode,
                provinceCode: initialData.provinceCode,
                cityCode: initialData.cityCode,
                barangayCode: initialData.barangayCode,
            });
            if (initialData.coordinates) {
                setMapRegion({
                    latitude: initialData.coordinates.latitude,
                    longitude: initialData.coordinates.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            } else {
                setMapRegion(DEFAULT_REGION);
            }
        } else {
            setForm(makeBlank('', '', '', existingCount === 0));
            setGeoCodes({});
            setProvinceList([]);
            setCityList([]);
            setBarangayList([]);
            setMapRegion(DEFAULT_REGION);
        }
        setOpenDropdown(null);
    }, [visible, initialData]);

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

    const debouncedGeocode = (override?: Partial<Omit<Address, 'id'>>) => {
        if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
        geocodeTimerRef.current = setTimeout(() => {
            attemptForwardGeocode(override);
        }, 1000);
    };

    const reverseGeocodeAndFill = async (lat: number, lng: number) => {
        if (!isMounted.current) return;
        setIsReverseGeocoding(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                { headers: { 'User-Agent': 'BazaarXApp/1.0' } },
            );
            const data = await res.json();
            if (!data?.address || !isMounted.current) return;

            const a = data.address;
            const gStreet = a.road || a.pedestrian || '';
            const gBarangay = a.neighbourhood || a.suburb || a.village || '';
            const gCity = a.city || a.municipality || a.town || '';
            const gProvince = a.county || a.state || '';
            const gRegion = a.region || a.state || '';
            const gZip = a.postcode || '';

            setForm(prev => ({
                ...prev,
                street: gStreet || prev.street,
                barangay: gBarangay,
                city: gCity,
                province: gProvince,
                region: gRegion,
                zipCode: gZip || prev.zipCode,
                coordinates: { latitude: lat, longitude: lng },
            }));

            let regList = regionList;
            if (regList.length === 0) {
                regList = await regions();
                if (isMounted.current) setRegionList(regList);
            }

            const metroCities = ['manila', 'quezon', 'makati', 'pasig', 'taguig', 'marikina', 'paranaque',
                'pasay', 'caloocan', 'malabon', 'navotas', 'valenzuela', 'muntinlupa',
                'las piñas', 'san juan', 'mandaluyong', 'pateros'];

            const matchedRegion = regList.find((r: any) => {
                const rName = r.region_name?.toLowerCase() || '';
                const gR = gRegion.toLowerCase();
                const gC = gCity.toLowerCase();
                if (rName.includes('metro manila') || rName.includes('ncr') || rName.includes('national capital')) {
                    return gR.includes('metro manila') || gR.includes('ncr') || gR.includes('national capital') ||
                        metroCities.some(c => gC.includes(c));
                }
                return rName.includes(gR) || gR.includes(rName);
            });

            if (!matchedRegion || !isMounted.current) return;

            const newCodes: typeof geoCodes = { regionCode: matchedRegion.region_code };
            setForm(prev => ({ ...prev, region: matchedRegion.region_name }));

            const provList = await provinces(matchedRegion.region_code);
            if (!isMounted.current) return;
            setProvinceList(provList);

            const isMetroManila = matchedRegion.region_name?.toLowerCase().includes('metro manila') ||
                matchedRegion.region_name?.toLowerCase().includes('ncr') ||
                matchedRegion.region_code === '13';

            if (isMetroManila) {
                // Auto-fill "Metro Manila" as province for NCR
                setForm(prev => ({ ...prev, province: METRO_MANILA_LABEL }));

                let allCities: any[] = [];
                for (const prov of provList) {
                    const pc = await getCachedCities(prov.province_code);
                    allCities = [...allCities, ...pc];
                }
                if (!isMounted.current) return;
                setCityList(allCities);

                const matchedCity = allCities.find((c: any) => {
                    const cN = c.city_name?.toLowerCase() || '';
                    return cN.includes(gCity.toLowerCase()) || gCity.toLowerCase().includes(cN.split(' ')[0]);
                });
                if (matchedCity) {
                    newCodes.cityCode = matchedCity.city_code;
                    setForm(prev => ({ ...prev, city: matchedCity.city_name }));
                    const bList = await getCachedBarangays(matchedCity.city_code);
                    if (!isMounted.current) return;
                    setBarangayList(bList);
                    const matchedBrgy = bList.find((b: any) => {
                        const bN = b.brgy_name?.toLowerCase() || '';
                        return bN.includes(gBarangay.toLowerCase()) || gBarangay.toLowerCase().includes(bN);
                    });
                    if (matchedBrgy) {
                        newCodes.barangayCode = matchedBrgy.brgy_code;
                        setForm(prev => ({ ...prev, barangay: matchedBrgy.brgy_name }));
                    }
                }
            } else {
                const matchedProv = provList.find((p: any) => {
                    const pN = p.province_name?.toLowerCase() || '';
                    return pN.includes(gProvince.toLowerCase()) || gProvince.toLowerCase().includes(pN);
                });
                if (matchedProv) {
                    newCodes.provinceCode = matchedProv.province_code;
                    setForm(prev => ({ ...prev, province: matchedProv.province_name }));
                    const cList = await cities(matchedProv.province_code);
                    if (!isMounted.current) return;
                    setCityList(cList);
                    const matchedCity = cList.find((c: any) => {
                        const cN = c.city_name?.toLowerCase() || '';
                        return cN.includes(gCity.toLowerCase()) || gCity.toLowerCase().includes(cN.split(' ')[0]);
                    });
                    if (matchedCity) {
                        newCodes.cityCode = matchedCity.city_code;
                        setForm(prev => ({ ...prev, city: matchedCity.city_name }));
                        const bList = await barangays(matchedCity.city_code);
                        if (!isMounted.current) return;
                        setBarangayList(bList);
                        const matchedBrgy = bList.find((b: any) => {
                            const bN = b.brgy_name?.toLowerCase() || '';
                            return bN.includes(gBarangay.toLowerCase()) || gBarangay.toLowerCase().includes(bN);
                        });
                        if (matchedBrgy) {
                            newCodes.barangayCode = matchedBrgy.brgy_code;
                            setForm(prev => ({ ...prev, barangay: matchedBrgy.brgy_name }));
                        }
                    }
                }
            }

            if (isMounted.current) setGeoCodes(newCodes);
        } catch { /* silent */ } finally {
            if (isMounted.current) setIsReverseGeocoding(false);
        }
    };

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
        setOpenDropdown(null);
        setIsLoadingLocation(true);

        if (isNCR(code)) {
            // For NCR, skip province entirely — auto-set "Metro Manila" and load all cities
            const provs = await getCachedProvinces(code);
            const allCities: any[] = [];
            for (const prov of provs) {
                const pc = await getCachedCities(prov.province_code);
                allCities.push(...pc);
            }
            if (!isMounted.current) return;
            setForm(prev => ({ ...prev, region: name, province: METRO_MANILA_LABEL, city: '', barangay: '', coordinates: null }));
            setGeoCodes({ regionCode: code });
            setProvinceList(provs);
            setCityList(allCities);
            setBarangayList([]);
        } else {
            const provs = await getCachedProvinces(code);
            if (!isMounted.current) return;
            setForm(prev => ({ ...prev, region: name, province: '', city: '', barangay: '', coordinates: null }));
            setGeoCodes({ regionCode: code });
            setProvinceList(provs);
            setCityList([]);
            setBarangayList([]);
        }
        setIsLoadingLocation(false);
    };

    const onProvinceChange = async (code: string) => {
        const name = provinceList.find((p: any) => p.province_code === code)?.province_name || '';
        setForm(prev => ({ ...prev, province: name, city: '', barangay: '', coordinates: null }));
        setGeoCodes(prev => ({ ...prev, provinceCode: code, cityCode: undefined, barangayCode: undefined }));
        setOpenDropdown(null);
        setIsLoadingLocation(true);
        const cts = await getCachedCities(code);
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
        const bList = await getCachedBarangays(code);
        if (!isMounted.current) return;
        setBarangayList(bList);
        setIsLoadingLocation(false);
        debouncedGeocode({ city: name, barangay: '' });
    };

    const onBarangayChange = (name: string, brgyCode?: string) => {
        setForm(prev => ({ ...prev, barangay: name }));
        if (brgyCode) setGeoCodes(prev => ({ ...prev, barangayCode: brgyCode }));
        setOpenDropdown(null);
        debouncedGeocode({ barangay: name });
    };

    const onStreetBlur = () => {
        if (form.street.length > 3) debouncedGeocode();
    };

    // ---------------------------------------------------------------------------
    // Map confirm
    // ---------------------------------------------------------------------------

    const handleConfirmPin = () => {
        const lat = mapRegion.latitude;
        const lng = mapRegion.longitude;
        setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng } }));
        setShowMapModal(false);
        reverseGeocodeAndFill(lat, lng);
    };

    // ---------------------------------------------------------------------------
    // GPS — "Use My Location"
    // ---------------------------------------------------------------------------

    const handleUseMyLocation = useCallback(async () => {
        if (isGettingLocation) return;
        setIsGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'We need access to your location to accurately place your address on the map. Please enable Location in your device Settings.',
                    [{ text: 'OK' }],
                );
                return;
            }
            const position = await Location.getCurrentPositionAsync({
                accuracy: 3 as any,
            });
            const { latitude, longitude } = position.coords;
            setForm(prev => ({ ...prev, coordinates: { latitude, longitude } }));
            setMapRegion({ latitude, longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            reverseGeocodeAndFill(latitude, longitude);
        } catch (error) {
            console.error('[AddressFormModal] Location error:', error);
            Alert.alert(
                'Could not get location',
                'Please make sure your GPS is turned on and try again.',
                [{ text: 'OK' }],
            );
        } finally {
            if (isMounted.current) setIsGettingLocation(false);
        }
    }, [isGettingLocation, reverseGeocodeAndFill]);

    // ---------------------------------------------------------------------------
    // Save
    // ---------------------------------------------------------------------------

    const handleSave = async () => {
        if (!userId) return;

        const errors: Record<string, string> = {};
        if (!form.firstName?.trim()) errors.firstName = 'First name is required';
        if (!form.lastName?.trim()) errors.lastName = 'Last name is required';
        if (!form.phone?.trim()) errors.phone = 'Phone number is required';
        if (!form.region?.trim()) errors.region = 'Region is required';
        if (!form.city?.trim()) errors.city = 'City / Municipality is required';
        if (!form.street?.trim()) errors.street = 'Street / House No. is required';
        const isNCR = form.region?.toLowerCase().includes('ncr') ||
            form.region?.toLowerCase().includes('metro manila') ||
            form.region?.toLowerCase().includes('national capital');
        if (!isNCR && !form.province?.trim()) errors.province = 'Province is required';

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            Alert.alert('Incomplete Address', 'Please fill in all required fields.');
            return;
        }
        setFieldErrors({});

        setIsSaving(true);
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
        const hasError = !!fieldErrors[type];

        return (
            <View style={{ marginBottom: 12 }}>
                <Text style={s.inputLabel}>{label}</Text>
                <Pressable
                    onPress={() => {
                        if (disabled) return;
                        if (isOpen) {
                            setOpenDropdown(null);
                        } else {
                            setDropdownSearch('');
                            setDebouncedSearch('');
                            setOpenDropdown(type);
                        }
                    }}
                    style={[
                        s.dropdownTrigger,
                        disabled && s.dropdownDisabled,
                        isOpen && s.dropdownTriggerOpen,
                        hasError && !isOpen && s.dropdownError,
                    ]}
                >
                    <Text
                        style={[s.dropdownSelectedText, !value && { color: '#9CA3AF' }]}
                        numberOfLines={1}
                    >
                        {value || 'Select...'}
                    </Text>
                    {isLoadingLocation && isOpen
                        ? <ActivityIndicator size="small" color={COLORS.primary} />
                        : <Search size={18} color={disabled ? '#9CA3AF' : '#6B7280'} />
                    }
                </Pressable>
                {hasError && !isOpen && (
                    <Text style={s.fieldErrorText}>{fieldErrors[type]}</Text>
                )}
            </View>
        );
    };

    // ---------------------------------------------------------------------------
    // Dropdown overlay — separate Modal so ScrollView is NOT nested
    // ---------------------------------------------------------------------------

    const renderDropdownOverlay = () => {
        if (!openDropdown) return null;

        const type = openDropdown;
        const labelMap: Record<string, string> = { region: 'Region', province: 'Province', city: 'City / Municipality', barangay: 'Barangay' };
        const list = type === 'region' ? regionList
            : type === 'province' ? provinceList
                : type === 'city' ? cityList : barangayList;

        const normalizedQuery = debouncedSearch.trim().toLowerCase();
        const filtered = normalizedQuery
            ? list.filter((item: any) => {
                const name = item.region_name || item.province_name || item.city_name || item.brgy_name || '';
                return name.toLowerCase().includes(normalizedQuery);
            })
            : list;
        const maxItems = type === 'barangay' ? 200 : filtered.length;
        const capped = filtered.slice(0, maxItems);
        const showSearchHint = type === 'barangay' && list.length > 200 && !dropdownSearch;

        // Build flat data with group headers for regions
        type ListRow = { _type: 'header'; group: string } | { _type: 'item'; item: any; index: number };
        const flatData: ListRow[] = type === 'region'
            ? (['Luzon', 'Visayas', 'Mindanao'] as const).flatMap(group => {
                const groupItems = capped.filter((item: any) => getIslandGroup(item.region_code) === group);
                if (groupItems.length === 0) return [];
                return [
                    { _type: 'header' as const, group },
                    ...groupItems.map((item: any, index: number) => ({ _type: 'item' as const, item, index })),
                ];
            })
            : capped.map((item: any, index: number) => ({ _type: 'item' as const, item, index }));

        const closeOverlay = () => {
            setOpenDropdown(null);
            setDropdownSearch('');
            setDebouncedSearch('');
            Keyboard.dismiss();
        };

        return (
            <Modal transparent visible animationType="fade" onRequestClose={closeOverlay}>
                <Pressable style={s.overlayBackdrop} onPress={closeOverlay}>
                    <Animated.View
                        style={[
                            s.overlayPanel,
                            { opacity: dropdownOpacity, transform: [{ translateY: dropdownSlide }] },
                        ]}
                    >
                        <Pressable onPress={() => { }} /* prevent backdrop dismiss when tapping panel */>
                            {/* Header */}
                            <View style={s.overlayHeader}>
                                <Text style={s.overlayTitle}>Select {labelMap[type]}</Text>
                                <Pressable onPress={closeOverlay} style={s.overlayCloseBtn}>
                                    <X size={20} color="#6B7280" />
                                </Pressable>
                            </View>

                            {/* Search */}
                            <View style={s.overlaySearchWrap}>
                                <TextInput
                                    style={s.overlaySearchInput}
                                    placeholder={`Search ${labelMap[type].toLowerCase()}...`}
                                    placeholderTextColor="#9CA3AF"
                                    value={dropdownSearch}
                                    onChangeText={setDropdownSearch}

                                />
                            </View>

                            {showSearchHint && (
                                <Text style={s.dropdownHint}>Showing first 200 — type to narrow</Text>
                            )}

                            {/* Scrollable list */}
                            <ScrollView
                                style={{ maxHeight: 400 }}
                                keyboardShouldPersistTaps="handled"
                                bounces={false}
                                showsVerticalScrollIndicator
                            >
                                {flatData.length > 0 ? flatData.map((row, i) => {
                                    if (row._type === 'header') {
                                        return (
                                            <View key={`header-${row.group}`} style={s.groupHeader}>
                                                <Text style={s.groupHeaderText}>{row.group}</Text>
                                            </View>
                                        );
                                    }
                                    const name = row.item.region_name || row.item.province_name || row.item.city_name || row.item.brgy_name || '';
                                    return (
                                        <Pressable
                                            key={`${type}-item-${i}`}
                                            style={({ pressed }) => [s.selectItem, pressed && { backgroundColor: '#FFF7ED' }]}
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setDropdownSearch('');
                                                setFieldErrors(prev => { const n = { ...prev }; delete n[type]; return n; });
                                                if (type === 'region') onRegionChange(row.item.region_code);
                                                else if (type === 'province') onProvinceChange(row.item.province_code);
                                                else if (type === 'city') onCityChange(row.item.city_code);
                                                else onBarangayChange(row.item.brgy_name, row.item.brgy_code);
                                            }}
                                        >
                                            <Text style={s.selectItemText}>{name}</Text>
                                        </Pressable>
                                    );
                                }) : dropdownSearch.length > 0 ? (
                                    <View style={s.dropdownEmpty}>
                                        <Text style={s.dropdownEmptyText}>Location not found</Text>
                                    </View>
                                ) : null}
                            </ScrollView>
                        </Pressable>
                    </Animated.View>
                </Pressable>
            </Modal>
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
                        <Text style={s.headerTitle}>{initialData ? 'Edit Address' : 'Add Address'}</Text>
                        <Pressable onPress={onClose} style={s.closeBtn}>
                            <X size={22} color="#1F2937" />
                        </Pressable>
                    </View>

                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Address type selector */}
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

                        {/* Contact info */}
                        <Text style={s.sectionHeader}>Contact Information</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.inputLabel}>First Name</Text>
                                <TextInput value={form.firstName} onChangeText={t => setForm(prev => ({ ...prev, firstName: t }))} style={s.input} placeholder="John" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.inputLabel}>Last Name</Text>
                                <TextInput value={form.lastName} onChangeText={t => setForm(prev => ({ ...prev, lastName: t }))} style={s.input} placeholder="Doe" />
                            </View>
                        </View>
                        <Text style={s.inputLabel}>Phone Number</Text>
                        <TextInput
                            value={form.phone}
                            onChangeText={handlePhoneChange}
                            style={[s.input, phoneError && s.inputError, { marginBottom: phoneError ? 4 : 16 }]}
                            placeholder="09XXXXXXXXX"
                            keyboardType="phone-pad"
                            maxLength={13}
                        />
                        {phoneError && (
                            <Text style={s.fieldError}>Enter a valid PH number (09XXXXXXXXX or +639XXXXXXXXX)</Text>
                        )}

                        {/* Location details */}
                        <Text style={[s.sectionHeader, { marginTop: 12 }]}>Location Details</Text>

                        {/* Pin Location */}
                        <Text style={s.inputLabel}>Pin Location</Text>

                        {/* Use My Location button */}
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

                        <View style={s.mapWrapper}>
                            <MapView
                                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                                style={s.mapPreview}
                                region={mapRegion}
                                scrollEnabled={false}
                                zoomEnabled={false}
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

                            <View style={s.mapOverlay}>
                                <Pressable style={s.adjustPinBtn} onPress={() => setShowMapModal(true)}>
                                    <Move size={14} color="#FFF" />
                                    <Text style={s.adjustPinText}>Adjust Pin</Text>
                                </Pressable>
                            </View>
                        </View>

                        <Text style={[s.inputLabel, { marginTop: 12 }]}>Label</Text>
                        <TextInput value={form.label} onChangeText={t => setForm(prev => ({ ...prev, label: t }))} style={s.input} placeholder="Home, Office..." />

                        {renderDropdown({ label: 'Region', type: 'region', value: form.region, list: regionList })}

                        {/* Province — auto-locked to "Metro Manila" for NCR */}
                        {geoCodes.regionCode === NCR_REGION_CODE ? (
                            <View style={{ marginBottom: 12 }}>
                                <Text style={s.inputLabel}>Province</Text>
                                <View style={[s.dropdownTrigger, s.dropdownDisabled]}>
                                    <Text style={[s.dropdownSelectedText, { color: '#6B7280' }]} numberOfLines={1}>
                                        Metro Manila
                                    </Text>
                                    <MapPin size={16} color="#9CA3AF" />
                                </View>
                            </View>
                        ) : (
                            renderDropdown({ label: 'Province', type: 'province', value: form.province, list: provinceList, disabled: !form.region })
                        )}

                        {renderDropdown({
                            label: 'City / Municipality',
                            type: 'city',
                            value: form.city,
                            list: cityList,
                            disabled: !form.province && geoCodes.regionCode !== NCR_REGION_CODE,
                        })}
                        {renderDropdown({ label: 'Barangay', type: 'barangay', value: form.barangay, list: barangayList, disabled: !form.city })}

                        <Text style={s.inputLabel}>Street / House No.</Text>
                        <TextInput
                            value={form.street}
                            onChangeText={t => setForm(prev => ({ ...prev, street: t }))}
                            onEndEditing={onStreetBlur}
                            style={s.input}
                            placeholder="123 Acacia St."
                        />

                        {/* Optional fields */}
                        <Text style={[s.inputLabel, { marginTop: 12 }]}>Landmark (Optional)</Text>
                        <TextInput value={form.landmark || ''} onChangeText={t => setForm(prev => ({ ...prev, landmark: t }))} style={s.input} placeholder="Near 7-Eleven, Colored gate" />

                        <Text style={s.inputLabel}>Delivery Instructions (Optional)</Text>
                        <TextInput
                            value={form.deliveryInstructions || ''}
                            onChangeText={t => setForm(prev => ({ ...prev, deliveryInstructions: t }))}
                            style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                            placeholder="Leave at front desk..."
                            multiline
                        />

                        <Text style={s.inputLabel}>Postal Code</Text>
                        <TextInput value={form.zipCode} onChangeText={t => setForm(prev => ({ ...prev, zipCode: t }))} style={s.input} placeholder="1000" keyboardType="number-pad" />

                        {/* Toggles */}
                        <Toggle
                            value={form.isDefault}
                            onToggle={() => setForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                            label="Set as default delivery address"
                        />

                        {context === 'seller' && (
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

                    {/* Dropdown results overlay — separate Modal so list scrolls freely */}
                    {renderDropdownOverlay()}

                    {/* Sticky footer */}
                    <View style={s.footer}>
                        <Pressable style={[s.saveBtn, isSaving && { opacity: 0.7 }]} onPress={handleSave} disabled={isSaving}>
                            {isSaving
                                ? <ActivityIndicator color="#FFF" />
                                : <Text style={s.saveBtnText}>{initialData ? 'Save Changes' : 'Add Address'}</Text>
                            }
                        </Pressable>
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

    dropdownTrigger: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#FFF' },
    dropdownTriggerOpen: { borderColor: COLORS.primary },
    dropdownDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
    dropdownError: { borderColor: '#EF4444' },
    dropdownTextInput: { fontSize: 15, color: '#1F2937', flex: 1, marginRight: 8, paddingVertical: 0 },
    dropdownSelectedText: { fontSize: 15, color: '#1F2937', flex: 1 },

    // Overlay panel (separate Modal)
    overlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    overlayPanel: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#FFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 20,
        overflow: 'hidden',
    },
    overlayHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    overlayTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
    overlayCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    overlaySearchWrap: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    overlaySearchInput: { height: 42, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: '#1F2937', backgroundColor: '#F9FAFB' },

    dropdownHint: { fontSize: 11, color: '#9CA3AF', paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F9FAFB' },
    dropdownEmpty: { minHeight: 80, padding: 20, alignItems: 'center', justifyContent: 'center' },
    dropdownEmptyText: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', width: '100%' },
    fieldErrorText: { fontSize: 12, color: '#EF4444', marginTop: 4, marginBottom: 4 },
    groupHeader: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    groupHeaderText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    selectItem: { height: 44, justifyContent: 'center', paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFF' },
    selectItemText: { fontSize: 15, color: '#374151' },

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
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF', padding: -3, paddingLeft: 8, paddingRight: 8 },

    inputError: { borderColor: '#EF4444' },
    fieldError: { fontSize: 12, color: '#EF4444', marginBottom: 12, marginTop: 0 },

    useLocationBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 16,
        backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA',
        borderRadius: 12, marginBottom: 10,
    },
    useLocationText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});