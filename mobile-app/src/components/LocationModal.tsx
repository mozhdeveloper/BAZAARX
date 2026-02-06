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
import { X, Search, MapPin, Home, Briefcase, Target, Check } from 'lucide-react-native';
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

  // --- INITIALIZATION ---
  useEffect(() => {
    if (visible) {
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
    }
  }, [visible, initialCoordinates, currentAddress]);

  // Fetch saved addresses
  useEffect(() => {
    if (!user) return;
    const fetchSavedAddresses = async () => {
      const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id);
      if (data) setAddresses(data);
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

  // --- 5. CONFIRM SELECTION ---
  const handleConfirm = () => {
    // Send back the current search text AND the exact map coordinates AND location details
    const finalAddress = searchQuery || "Pinned Location";
    const coords = {
      latitude: region.latitude,
      longitude: region.longitude
    };
    
    // Build final location details
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
          <Text style={styles.headerTitle}>Select Delivery Location</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={22} color="#1F2937" strokeWidth={2.5} />
          </Pressable>
        </View>

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
                      keyExtractor={(item, index) => index.toString()}
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
              
              {addresses.map((address) => {
                const isSelected = selectedAddressId === address.id;
                return (
                  <Pressable
                    key={address.id}
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

        {/* Confirm Button */}
        <View style={[styles.confirmContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
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
});