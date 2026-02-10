import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
} from 'react-native';
import { X, Search, MapPin, Home, Briefcase, Target, Check, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react-native';
import { regions, provinces, cities, barangays } from 'select-philippines-address';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const { height } = Dimensions.get('window');

interface LocationDetails {
  address: string;
  coordinates: { latitude: number; longitude: number };
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  region?: string;
  postalCode?: string;
}

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, coords?: { latitude: number, longitude: number }, details?: LocationDetails) => void;
  currentAddress?: string;
  initialCoordinates?: { latitude: number; longitude: number } | null;
}

export default function LocationModal({
  visible,
  onClose,
  onSelectLocation,
  currentAddress,
  initialCoordinates,
}: LocationModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  // Ref to programmatically move the map
  const mapRef = useRef<MapView>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading & Search States
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Location details state for autofill
  const [locationDetails, setLocationDetails] = useState<LocationDetails | null>(null);

  // Map Region State
  const [region, setRegion] = useState<Region>({
    latitude: 14.5995,
    longitude: 120.9842, // Default Manila
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  // --- STEP NAVIGATION: 'map' or 'form' ---
  const [currentStep, setCurrentStep] = useState<'map' | 'form'>('map');

  // --- ADDRESS FORM FIELDS ---
  const [formAddress, setFormAddress] = useState({
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    postalCode: '',
    label: 'Home',
  });

  // --- PHILIPPINES ADDRESS DROPDOWN LISTS ---
  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (visible) {
      // Reset to map step when modal opens
      setCurrentStep('map');
      setOpenDropdown(null);
      
      if (initialCoordinates) {
        const newRegion = {
          latitude: initialCoordinates.latitude,
          longitude: initialCoordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setRegion(newRegion);
        // Animate map to initial coords
        setTimeout(() => mapRef.current?.animateToRegion(newRegion, 1000), 200);
      }
      if (currentAddress && currentAddress !== 'Select Location') {
        setSearchQuery(currentAddress);
      }
      setSuggestions([]); // Clear previous suggestions
      
      // Load regions for dropdown
      regions().then((data: any[]) => setRegionList(data));
    }
  }, [visible, initialCoordinates, currentAddress]);

  // Fetch saved addresses
  useEffect(() => {
    if (!user || !visible) return;
    const fetchSavedAddresses = async () => {
      try {
        const { data } = await supabase.from('shipping_addresses').select('*').eq('user_id', user.id);
        if (data) {
          // Map from DB schema to component format
          const mapped = data.map(a => ({
            id: a.id,
            label: a.label || 'Address',
            street: a.address_line_1 || '',
            barangay: a.barangay || '',
            city: a.city || '',
            province: a.province || '',
            region: a.region || '',
            postalCode: a.postal_code || '',
            coordinates: a.coordinates || null,
            is_default: a.is_default || false,
          }));
          
          // Ensure unique IDs (defensive programming)
          const uniqueAddresses = mapped.filter((addr, index, self) => 
            index === self.findIndex(a => a.id === addr.id)
          );
          
          setAddresses(uniqueAddresses);
        }
      } catch (error) {
        console.error('[LocationModal] Error fetching addresses:', error);
      }
    };
    fetchSavedAddresses();
  }, [user, visible]);

  // --- 1. AUTOCOMPLETE SEARCH ---
  const handleTextChange = (text: string) => {
    setSearchQuery(text);
    setSelectedAddressId(null);

    // Debounce: Wait 600ms before API call
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&addressdetails=1&limit=5&countrycodes=ph`,
          { headers: { 'User-Agent': 'BazaarXApp/1.0' } }
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.log('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  // --- 2. SELECT SUGGESTION ---
  const handleSelectSuggestion = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    
    // Move Map
    const newRegion = {
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);

    // Extract address details from suggestion
    const addr = item.address || {};
    const details: LocationDetails = {
      address: item.display_name,
      coordinates: { latitude: lat, longitude: lon },
      street: addr.road || addr.pedestrian || '',
      barangay: addr.neighbourhood || addr.suburb || addr.village || '',
      city: addr.city || addr.municipality || addr.town || '',
      province: addr.county || addr.state || '',
      region: addr.region || addr.state || '',
      postalCode: addr.postcode || '',
    };
    setLocationDetails(details);

    // Update UI
    setSearchQuery(item.display_name);
    setSuggestions([]); // Close dropdown
    Keyboard.dismiss();
  };

  // --- 3. USE CURRENT LOCATION ---
  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to use this feature.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      // Move map and update state
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

      // Reverse Geocode with address details
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { 'User-Agent': 'BazaarXApp/1.0' } }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const simpleAddress = (data.display_name || '').split(',').slice(0, 3).join(',');
        setSearchQuery(simpleAddress);
        setSelectedAddressId(null);
        
        // Extract address details for autofill
        const addr = data.address || {};
        const details: LocationDetails = {
          address: data.display_name,
          coordinates: { latitude, longitude },
          street: addr.road || addr.pedestrian || '',
          barangay: addr.neighbourhood || addr.suburb || addr.village || '',
          city: addr.city || addr.municipality || addr.town || '',
          province: addr.county || addr.state || '',
          region: addr.region || addr.state || '',
          postalCode: addr.postcode || '',
        };
        setLocationDetails(details);
      }

    } catch (error) {
      Alert.alert('Error', 'Could not fetch location. Please check your GPS settings.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // --- 4. SELECT SAVED ADDRESS ---
  const handleSelectAddress = (item: any) => {
    setSelectedAddressId(item.id);
    const addrString = `${item.street}, ${item.city}`;
    setSearchQuery(addrString);
    
    // Set location details from saved address
    const details: LocationDetails = {
      address: addrString,
      coordinates: item.coordinates || { latitude: region.latitude, longitude: region.longitude },
      street: item.street || '',
      barangay: item.barangay || '',
      city: item.city || '',
      province: item.province || '',
      region: item.region || '',
      postalCode: item.postalCode || item.postal_code || '',
    };
    setLocationDetails(details);
    
    if (item.coordinates) {
      const newRegion = {
        latitude: item.coordinates.latitude,
        longitude: item.coordinates.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    }
  };

  // --- 5. PROCEED TO ADDRESS FORM ---
  const handleProceedToForm = async () => {
    // Pre-fill the form with geocoded data
    const geocodedRegion = locationDetails?.region || '';
    const geocodedProvince = locationDetails?.province || '';
    const geocodedCity = locationDetails?.city || '';
    const geocodedBarangay = locationDetails?.barangay || '';
    
    setFormAddress({
      street: locationDetails?.street || '',
      barangay: geocodedBarangay,
      city: geocodedCity,
      province: geocodedProvince,
      region: geocodedRegion,
      postalCode: locationDetails?.postalCode || '',
      label: 'Home',
    });
    
    // Try to match geocoded data to Philippines address API and load dropdown choices
    try {
      // Load regions if not already loaded
      let regList = regionList;
      if (regList.length === 0) {
        regList = await regions();
        setRegionList(regList);
      }
      
      // Find matching region (try different name variations)
      const matchedRegion = regList.find((r: any) => {
        const rName = r.region_name?.toLowerCase() || '';
        const gRegion = geocodedRegion.toLowerCase();
        const gProvince = geocodedProvince.toLowerCase();
        const gCity = geocodedCity.toLowerCase();
        
        // Check for Metro Manila variations
        if (rName.includes('metro manila') || rName.includes('ncr') || rName.includes('national capital')) {
          if (gRegion.includes('metro manila') || gRegion.includes('ncr') || gRegion.includes('national capital') ||
              gProvince.includes('metro manila') || gCity.includes('manila') || gCity.includes('quezon') ||
              gCity.includes('makati') || gCity.includes('pasig') || gCity.includes('taguig') ||
              gCity.includes('marikina') || gCity.includes('paranaque') || gCity.includes('pasay') ||
              gCity.includes('caloocan') || gCity.includes('malabon') || gCity.includes('navotas') ||
              gCity.includes('valenzuela') || gCity.includes('muntinlupa') || gCity.includes('las piñas') ||
              gCity.includes('san juan') || gCity.includes('mandaluyong') || gCity.includes('pateros')) {
            return true;
          }
        }
        
        // Direct match
        return rName.includes(gRegion) || gRegion.includes(rName);
      });
      
      if (matchedRegion) {
        // Update form with matched region name
        setFormAddress(prev => ({ ...prev, region: matchedRegion.region_name }));
        
        // Load provinces for this region
        const provList = await provinces(matchedRegion.region_code);
        setProvinceList(provList);
        
        const isMetroManila = matchedRegion.region_name?.toLowerCase().includes('metro manila') || 
                              matchedRegion.region_name?.toLowerCase().includes('ncr') ||
                              matchedRegion.region_code === '13';
        
        if (isMetroManila) {
          // For Metro Manila, load all cities from all districts
          let allCities: any[] = [];
          for (const prov of provList) {
            const provCities = await cities(prov.province_code);
            allCities = [...allCities, ...provCities];
          }
          setCityList(allCities);
          
          // Find matching city
          const matchedCity = allCities.find((c: any) => {
            const cName = c.city_name?.toLowerCase() || '';
            return cName.includes(geocodedCity.toLowerCase()) || geocodedCity.toLowerCase().includes(cName.split(' ')[0]);
          });
          
          if (matchedCity) {
            setFormAddress(prev => ({ ...prev, city: matchedCity.city_name }));
            
            // Load barangays for this city
            const brgyList = await barangays(matchedCity.city_code);
            setBarangayList(brgyList);
            
            // Find matching barangay
            if (geocodedBarangay) {
              const matchedBrgy = brgyList.find((b: any) => {
                const bName = b.brgy_name?.toLowerCase() || '';
                return bName.includes(geocodedBarangay.toLowerCase()) || geocodedBarangay.toLowerCase().includes(bName);
              });
              if (matchedBrgy) {
                setFormAddress(prev => ({ ...prev, barangay: matchedBrgy.brgy_name }));
              }
            }
          }
        } else {
          // Non-Metro Manila: Find matching province
          const matchedProvince = provList.find((p: any) => {
            const pName = p.province_name?.toLowerCase() || '';
            return pName.includes(geocodedProvince.toLowerCase()) || geocodedProvince.toLowerCase().includes(pName);
          });
          
          if (matchedProvince) {
            setFormAddress(prev => ({ ...prev, province: matchedProvince.province_name }));
            
            // Load cities for this province
            const cityListData = await cities(matchedProvince.province_code);
            setCityList(cityListData);
            
            // Find matching city
            const matchedCity = cityListData.find((c: any) => {
              const cName = c.city_name?.toLowerCase() || '';
              return cName.includes(geocodedCity.toLowerCase()) || geocodedCity.toLowerCase().includes(cName.split(' ')[0]);
            });
            
            if (matchedCity) {
              setFormAddress(prev => ({ ...prev, city: matchedCity.city_name }));
              
              // Load barangays for this city
              const brgyList = await barangays(matchedCity.city_code);
              setBarangayList(brgyList);
              
              // Find matching barangay
              if (geocodedBarangay) {
                const matchedBrgy = brgyList.find((b: any) => {
                  const bName = b.brgy_name?.toLowerCase() || '';
                  return bName.includes(geocodedBarangay.toLowerCase()) || geocodedBarangay.toLowerCase().includes(bName);
                });
                if (matchedBrgy) {
                  setFormAddress(prev => ({ ...prev, barangay: matchedBrgy.brgy_name }));
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Error loading address dropdowns:', error);
    }
    
    setCurrentStep('form');
  };

  // --- 6. FINAL CONFIRM (from form) ---
  const handleFinalConfirm = () => {
    // Check if this is Metro Manila/NCR (no province required)
    const isMetroManila = formAddress.region?.toLowerCase().includes('metro manila') || 
                          formAddress.region?.toLowerCase().includes('ncr') ||
                          formAddress.region?.toLowerCase().includes('national capital');
    
    // Validate required fields - province optional for Metro Manila
    if (!formAddress.street || !formAddress.city || !formAddress.region) {
      Alert.alert('Incomplete Address', 'Please fill in Street, City, and Region.');
      return;
    }
    
    if (!isMetroManila && !formAddress.province) {
      Alert.alert('Incomplete Address', 'Please select a Province.');
      return;
    }

    const finalAddress = `${formAddress.street}, ${formAddress.barangay ? formAddress.barangay + ', ' : ''}${formAddress.city}${formAddress.province ? ', ' + formAddress.province : ''}`;
    const coords = {
      latitude: region.latitude,
      longitude: region.longitude
    };
    
    const finalDetails: LocationDetails = {
      address: finalAddress,
      coordinates: coords,
      street: formAddress.street,
      barangay: formAddress.barangay,
      city: formAddress.city,
      province: formAddress.province,
      region: formAddress.region,
      postalCode: formAddress.postalCode,
    };
    
    onSelectLocation(finalAddress, coords, finalDetails);
    onClose();
  };

  // --- LEGACY: Quick confirm without form (for saved addresses) ---
  const handleConfirm = () => {
    const finalAddress = searchQuery || "Pinned Location";
    const coords = {
      latitude: region.latitude,
      longitude: region.longitude
    };
    
    const finalDetails: LocationDetails = locationDetails ? {
      ...locationDetails,
      address: finalAddress,
      coordinates: coords,
    } : {
      address: finalAddress,
      coordinates: coords,
    };
    
    onSelectLocation(finalAddress, coords, finalDetails);
    onClose();
  };

  // --- ADDRESS FORM: Region Selection ---
  const handleRegionSelect = async (regionItem: any) => {
    setFormAddress(prev => ({ ...prev, region: regionItem.region_name, province: '', city: '', barangay: '' }));
    setOpenDropdown(null);
    
    // Load provinces for this region
    const provList = await provinces(regionItem.region_code);
    setProvinceList(provList);
    
    // Check if this is Metro Manila/NCR - load cities directly
    const isMetroManila = regionItem.region_name?.toLowerCase().includes('metro manila') || 
                          regionItem.region_name?.toLowerCase().includes('ncr') ||
                          regionItem.region_code === '13';
    
    if (isMetroManila) {
      // For Metro Manila, load all cities from all districts
      let allCities: any[] = [];
      for (const prov of provList) {
        const provCities = await cities(prov.province_code);
        allCities = [...allCities, ...provCities];
      }
      setCityList(allCities);
    } else {
      setCityList([]);
    }
    
    setBarangayList([]);
  };

  // --- ADDRESS FORM: Province Selection ---
  const handleProvinceSelect = async (provinceItem: any) => {
    setFormAddress(prev => ({ ...prev, province: provinceItem.province_name, city: '', barangay: '' }));
    setOpenDropdown(null);
    // Load cities for this province
    const cityListData = await cities(provinceItem.province_code);
    setCityList(cityListData);
    setBarangayList([]);
  };

  // --- ADDRESS FORM: City Selection ---
  const handleCitySelect = async (cityItem: any) => {
    setFormAddress(prev => ({ ...prev, city: cityItem.city_name, barangay: '' }));
    setOpenDropdown(null);
    // Load barangays for this city
    const brgyList = await barangays(cityItem.city_code);
    setBarangayList(brgyList);
  };

  // --- ADDRESS FORM: Barangay Selection ---
  const handleBarangaySelect = (barangayItem: any) => {
    setFormAddress(prev => ({ ...prev, barangay: barangayItem.brgy_name }));
    setOpenDropdown(null);
  };

  // When dragging the map manually, reverse geocode the new location
  const reverseGeocodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const onRegionChangeComplete = async (newRegion: Region) => {
    setRegion(newRegion);
    
    // Debounce reverse geocoding to avoid too many API calls while dragging
    if (reverseGeocodeTimeout.current) clearTimeout(reverseGeocodeTimeout.current);
    
    reverseGeocodeTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newRegion.latitude}&lon=${newRegion.longitude}&addressdetails=1`,
          { headers: { 'User-Agent': 'BazaarXApp/1.0' } }
        );
        const data = await response.json();
        
        if (data && data.display_name) {
          const simpleAddress = (data.display_name || '').split(',').slice(0, 3).join(',');
          setSearchQuery(simpleAddress);
          
          // Extract address details for autofill
          const addr = data.address || {};
          const details: LocationDetails = {
            address: data.display_name,
            coordinates: { latitude: newRegion.latitude, longitude: newRegion.longitude },
            street: addr.road || addr.pedestrian || '',
            barangay: addr.neighbourhood || addr.suburb || addr.village || '',
            city: addr.city || addr.municipality || addr.town || '',
            province: addr.county || addr.state || '',
            region: addr.region || addr.state || '',
            postalCode: addr.postcode || '',
          };
          setLocationDetails(details);
        }
      } catch (error) {
        console.log('Reverse geocode error:', error);
      }
    }, 500);
  };

  const getAddressIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('home')) return <Home size={20} color="#FF5722" />;
    if (l.includes('office') || l.includes('work')) return <Briefcase size={20} color="#FF5722" />;
    return <MapPin size={20} color="#FF5722" />;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          {currentStep === 'form' ? (
            <Pressable onPress={() => setCurrentStep('map')} style={styles.backButton}>
              <ArrowLeft size={22} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <Text style={styles.headerTitle}>
            {currentStep === 'map' ? 'Select Delivery Location' : 'Complete Address'}
          </Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={22} color="#1F2937" strokeWidth={2.5} />
          </Pressable>
        </View>

        {currentStep === 'map' ? (
          /* ========== MAP STEP ========== */
          <>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView 
                style={styles.scrollContainer} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
              >
            
            {/* REAL MAP VIEW */}
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                style={styles.map}
                region={region}
                onRegionChangeComplete={onRegionChangeComplete}
                showsUserLocation={true}
              >
                {/* Marker stays at center coordinates */}
                <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
              </MapView>

              {/* Search Bar & Suggestions */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Search size={20} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search address..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={handleTextChange}
                  />
                  {isSearching && <ActivityIndicator size="small" color="#FF5722" />}
                </View>

                {/* AUTOCOMPLETE DROPDOWN */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsList}>
                    <FlatList
                      data={suggestions}
                      keyExtractor={(item, index) => item.place_id?.toString() || item.osm_id?.toString() || `suggestion-${index}`}
                      keyboardShouldPersistTaps="handled"
                      scrollEnabled={false} // Let parent ScrollView handle scrolling if needed
                      renderItem={({ item }) => (
                        <Pressable 
                          style={styles.suggestionItem} 
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <MapPin size={16} color="#6B7280" style={{ marginTop: 2 }} />
                          <Text style={styles.suggestionText} numberOfLines={2}>
                            {item.display_name}
                          </Text>
                        </Pressable>
                      )}
                    />
                  </View>
                )}
              </View>
            </View>
            
            {/* CURRENT LOCATION BUTTON */}
            <Pressable 
              style={({pressed}) => [styles.useLocationButton, pressed && { backgroundColor: '#F3F4F6' }]} 
              onPress={handleUseCurrentLocation}
              disabled={isLoadingLocation}
            >
              <View style={styles.useLocationIcon}>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#FF5722" />
                ) : (
                  <Target size={22} color="#FF5722" />
                )}
              </View>
              <View>
                <Text style={styles.useLocationTitle}>Use Current Location</Text>
                <Text style={styles.useLocationSubtitle}>Enable GPS to find your address</Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            {/* Saved Addresses Section */}
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>Saved Addresses</Text>
              
              {addresses.map((address, idx) => {
                const isSelected = selectedAddressId === address.id;
                return (
                  <Pressable
                    key={address.id || `address-${idx}`}
                    style={[styles.addressCard, isSelected && styles.addressCardSelected]}
                    onPress={() => handleSelectAddress(address)}
                  >
                    <View style={styles.addressIconContainer}>
                      {getAddressIcon(address.label)}
                    </View>
                    <View style={styles.addressContent}>
                      <Text style={styles.addressLabel}>{address.label}</Text>
                      <Text style={styles.addressText}>{address.street}, {address.city}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmarkContainer}>
                        <Check size={18} color="#FF5722" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
              
              {addresses.length === 0 && (
                <Text style={{ color: '#9CA3AF', fontStyle: 'italic', marginBottom: 20 }}>No saved addresses found.</Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Map Step: Confirm Button */}
        <View style={[styles.confirmContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.confirmButton} onPress={selectedAddressId ? handleConfirm : handleProceedToForm}>
            <Text style={styles.confirmButtonText}>
              {selectedAddressId ? 'Use This Address' : 'Continue to Address Details'}
            </Text>
          </Pressable>
        </View>
          </>
        ) : (
          /* ========== FORM STEP ========== */
          <>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView 
                style={styles.scrollContainer} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Address Type Selector */}
                <Text style={styles.formSectionTitle}>Address Label</Text>
                <View style={styles.typeSelectorContainer}>
                  {['Home', 'Office', 'Other'].map((type) => (
                    <Pressable
                      key={type}
                      style={[styles.typeOption, formAddress.label === type && styles.typeOptionActive]}
                      onPress={() => setFormAddress(prev => ({ ...prev, label: type }))}
                    >
                      {type === 'Home' && <Home size={16} color={formAddress.label === 'Home' ? '#FF5722' : '#6B7280'} />}
                      {type === 'Office' && <Briefcase size={16} color={formAddress.label === 'Office' ? '#FF5722' : '#6B7280'} />}
                      {type === 'Other' && <MapPin size={16} color={formAddress.label === 'Other' ? '#FF5722' : '#6B7280'} />}
                      <Text style={[styles.typeOptionText, formAddress.label === type && styles.typeOptionTextActive]}>{type}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Region Dropdown */}
                <Text style={styles.formSectionTitle}>Region *</Text>
                <Pressable 
                  style={styles.dropdownButton}
                  onPress={() => setOpenDropdown(openDropdown === 'region' ? null : 'region')}
                >
                  <Text style={formAddress.region ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {formAddress.region || 'Select Region'}
                  </Text>
                  {openDropdown === 'region' ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                </Pressable>
                {openDropdown === 'region' && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {regionList.map((r, idx) => (
                        <Pressable key={r.region_code || `region-${idx}`} style={styles.dropdownItem} onPress={() => handleRegionSelect(r)}>
                          <Text style={styles.dropdownItemText}>{r.region_name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Province Dropdown - Hidden for Metro Manila/NCR */}
                {!(formAddress.region?.toLowerCase().includes('metro manila') || 
                   formAddress.region?.toLowerCase().includes('ncr') ||
                   formAddress.region?.toLowerCase().includes('national capital')) && (
                  <>
                    <Text style={styles.formSectionTitle}>Province *</Text>
                    <Pressable 
                      style={[styles.dropdownButton, !formAddress.region && styles.dropdownDisabled]}
                      onPress={() => formAddress.region && setOpenDropdown(openDropdown === 'province' ? null : 'province')}
                      disabled={!formAddress.region}
                    >
                      <Text style={formAddress.province ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {formAddress.province || 'Select Province'}
                      </Text>
                      {openDropdown === 'province' ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                    </Pressable>
                    {openDropdown === 'province' && (
                      <View style={styles.dropdownList}>
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {provinceList.map((p, idx) => (
                            <Pressable key={p.province_code || `province-${idx}`} style={styles.dropdownItem} onPress={() => handleProvinceSelect(p)}>
                              <Text style={styles.dropdownItemText}>{p.province_name}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}

                {/* City Dropdown */}
                <Text style={styles.formSectionTitle}>City / Municipality *</Text>
                <Pressable 
                  style={[styles.dropdownButton, (!formAddress.province && !(formAddress.region?.toLowerCase().includes('metro manila') || formAddress.region?.toLowerCase().includes('ncr') || formAddress.region?.toLowerCase().includes('national capital'))) && styles.dropdownDisabled]}
                  onPress={() => (formAddress.province || formAddress.region?.toLowerCase().includes('metro manila') || formAddress.region?.toLowerCase().includes('ncr') || formAddress.region?.toLowerCase().includes('national capital')) && setOpenDropdown(openDropdown === 'city' ? null : 'city')}
                  disabled={!formAddress.province && !(formAddress.region?.toLowerCase().includes('metro manila') || formAddress.region?.toLowerCase().includes('ncr') || formAddress.region?.toLowerCase().includes('national capital'))}
                >
                  <Text style={formAddress.city ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {formAddress.city || 'Select City'}
                  </Text>
                  {openDropdown === 'city' ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                </Pressable>
                {openDropdown === 'city' && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {cityList.map((c, idx) => (
                        <Pressable key={c.city_code || `city-${idx}`} style={styles.dropdownItem} onPress={() => handleCitySelect(c)}>
                          <Text style={styles.dropdownItemText}>{c.city_name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Barangay Dropdown */}
                <Text style={styles.formSectionTitle}>Barangay</Text>
                <Pressable 
                  style={[styles.dropdownButton, !formAddress.city && styles.dropdownDisabled]}
                  onPress={() => formAddress.city && setOpenDropdown(openDropdown === 'barangay' ? null : 'barangay')}
                  disabled={!formAddress.city}
                >
                  <Text style={formAddress.barangay ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {formAddress.barangay || 'Select Barangay (Optional)'}
                  </Text>
                  {openDropdown === 'barangay' ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                </Pressable>
                {openDropdown === 'barangay' && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {barangayList.map((b, idx) => (
                        <Pressable key={b.brgy_code || `barangay-${idx}`} style={styles.dropdownItem} onPress={() => handleBarangaySelect(b)}>
                          <Text style={styles.dropdownItemText}>{b.brgy_name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Street / House No. */}
                <Text style={styles.formSectionTitle}>Street / House No. *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 123 Rizal Street"
                  placeholderTextColor="#9CA3AF"
                  value={formAddress.street}
                  onChangeText={(t) => setFormAddress(prev => ({ ...prev, street: t }))}
                />

                {/* Postal Code */}
                <Text style={styles.formSectionTitle}>Postal Code</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 1000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  value={formAddress.postalCode}
                  onChangeText={(t) => setFormAddress(prev => ({ ...prev, postalCode: t }))}
                />

                {/* Location Preview */}
                <View style={styles.locationPreview}>
                  <MapPin size={18} color="#FF5722" />
                  <Text style={styles.locationPreviewText}>
                    {searchQuery || 'Pin location selected on map'}
                  </Text>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Form Step: Save Button */}
            <View style={[styles.confirmContainer, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable style={styles.confirmButton} onPress={handleFinalConfirm}>
                <Text style={styles.confirmButtonText}>Save Address</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#1F2937', textAlign: 'center' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' },
  
  scrollContainer: { flex: 1 },
  
  // MAP STYLES
  mapContainer: { height: height * 0.45, position: 'relative', overflow: 'visible', zIndex: 10 },
  map: { width: '100%', height: '100%' },
  
  searchContainer: { position: 'absolute', top: 20, left: 20, right: 20, zIndex: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12, gap: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', padding: 0 },
  
  // Autocomplete Suggestions List
  suggestionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },

  useLocationButton: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF' },
  useLocationIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  useLocationTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  useLocationSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  divider: { height: 8, backgroundColor: '#F9FAFB' },

  savedSection: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },
  savedTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  addressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#F3F4F6', elevation: 2 },
  addressCardSelected: { borderColor: '#FF5722', backgroundColor: '#FFF5F0' },
  addressIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  addressContent: { flex: 1 },
  addressLabel: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
  addressText: { fontSize: 13, color: '#6B7280' },
  checkmarkContainer: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  
  confirmContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 16, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  confirmButton: { backgroundColor: '#FF5722', borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  confirmButtonText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },

  // Back button for form step
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' },

  // Form Styles
  formSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  formInput: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB' },
  
  // Type Selector
  typeSelectorContainer: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  typeOptionActive: { backgroundColor: '#FFF5F0', borderColor: '#FF5722' },
  typeOptionText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  typeOptionTextActive: { color: '#FF5722' },

  // Dropdown Styles
  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { fontSize: 15, color: '#1F2937' },
  dropdownPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  dropdownList: { backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 4, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, color: '#374151' },

  // Location Preview
  locationPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF5F0', borderRadius: 12, padding: 14, marginTop: 16 },
  locationPreviewText: { flex: 1, fontSize: 13, color: '#6B7280' },
});