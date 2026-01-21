import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Search, MapPin, Home, Briefcase, Heart, Target, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  icon: 'home' | 'office' | 'other';
}

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (address: string) => void;
  currentAddress?: string;
}

const savedAddresses: SavedAddress[] = [
  {
    id: '1',
    label: 'Home',
    address: '123 Main Street, Makati City, Metro Manila',
    icon: 'home',
  },
  {
    id: '2',
    label: 'Office',
    address: '45 Business Park, BGC, Taguig City',
    icon: 'office',
  },
  {
    id: '3',
    label: "Mom's House",
    address: '789 Residential Ave, Quezon City, Metro Manila',
    icon: 'other',
  },
];

const suggestedAddresses = [
  '100 Ayala Avenue, Makati City',
  '25 EDSA Corner Shaw Boulevard, Mandaluyong',
  '50 Ortigas Center, Pasig City',
  '15 Bonifacio High Street, BGC',
];

export default function LocationModal({
  visible,
  onClose,
  onSelectLocation,
  currentAddress = '123 Main St, Manila',
}: LocationModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedAddressId, setSelectedAddressId] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSelectAddress = (id: string, address: string) => {
    setSelectedAddressId(id);
  };

  const handleConfirm = () => {
    const selected = savedAddresses.find((addr) => addr.id === selectedAddressId);
    if (selected) {
      onSelectLocation(selected.address);
    }
    onClose();
  };

  const handleUseCurrentLocation = () => {
    onSelectLocation('Current Location: 456 Your Street, Manila');
    onClose();
  };

  const handleSearchFocus = () => {
    setShowSuggestions(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSelectSuggestion = (address: string) => {
    setSearchQuery(address);
    setShowSuggestions(false);
    onSelectLocation(address);
    onClose();
  };

  const getAddressIcon = (icon: string) => {
    switch (icon) {
      case 'home':
        return <Home size={20} color="#FF5722" strokeWidth={2.5} />;
      case 'office':
        return <Briefcase size={20} color="#FF5722" strokeWidth={2.5} />;
      default:
        return <Heart size={20} color="#FF5722" strokeWidth={2.5} />;
    }
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
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* Map Simulation Container */}
            <View style={styles.mapContainer}>
              {/* Map Background Image */}
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800' }}
                style={styles.mapBackground}
                resizeMode="cover"
              />
              
              {/* Map Overlay */}
              <View style={styles.mapOverlay} />

              {/* Central Pin */}
              <View style={styles.pinContainer}>
                <View style={styles.pinTooltip}>
                  <Text style={styles.pinTooltipText}>Move map to pin</Text>
                </View>
                <MapPin size={40} color="#FF5722" strokeWidth={2.5} fill="#FF5722" />
              </View>

              {/* Floating Search Bar */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Search size={20} color="#9CA3AF" strokeWidth={2.5} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search address..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={handleSearchFocus}
                    onBlur={handleSearchBlur}
                  />
                </View>

                {/* Address Suggestions Dropdown */}
                {showSuggestions && searchQuery.length > 0 && (
                  <View style={styles.suggestionsDropdown}>
                    {suggestedAddresses
                      .filter((addr) =>
                        addr.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((suggestion, index) => (
                        <Pressable
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(suggestion)}
                        >
                          <MapPin size={16} color="#9CA3AF" strokeWidth={2} />
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </Pressable>
                      ))}
                  </View>
                )}
              </View>
            </View>

            {/* Current Location Button */}
            <Pressable
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
            >
              <View style={styles.currentLocationIconContainer}>
                <Target size={22} color="#FF5722" strokeWidth={2.5} />
              </View>
              <View style={styles.currentLocationTextContainer}>
                <Text style={styles.currentLocationTitle}>Use Current Location</Text>
                <Text style={styles.currentLocationSubtitle}>
                  Enable GPS for accurate location
                </Text>
              </View>
            </Pressable>

            {/* Saved Addresses Section */}
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>Saved Addresses</Text>
              
              {savedAddresses.map((address) => {
                const isSelected = selectedAddressId === address.id;
                return (
                  <Pressable
                    key={address.id}
                    style={[
                      styles.addressCard,
                      isSelected && styles.addressCardSelected,
                    ]}
                    onPress={() => handleSelectAddress(address.id, address.address)}
                  >
                    <View style={styles.addressIconContainer}>
                      {getAddressIcon(address.icon)}
                    </View>
                    <View style={styles.addressContent}>
                      <Text style={styles.addressLabel}>{address.label}</Text>
                      <Text style={styles.addressText}>{address.address}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmarkContainer}>
                        <Check size={18} color="#FF5722" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Confirm Button - Fixed at Bottom */}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  // Map Simulation
  mapContainer: {
    height: height * 0.3,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  mapBackground: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 245, 247, 0.3)',
  },
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -48 }],
    alignItems: 'center',
  },
  pinTooltip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pinTooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.1,
  },
  // Floating Search Bar
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
    letterSpacing: -0.1,
  },
  suggestionsDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  // Current Location Button
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  currentLocationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  currentLocationTextContainer: {
    flex: 1,
  },
  currentLocationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  currentLocationSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  // Saved Addresses
  savedSection: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  addressCardSelected: {
    borderColor: '#FF5722',
    backgroundColor: '#FFF5F0',
    shadowColor: '#FF5722',
    shadowOpacity: 0.15,
  },
  addressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  addressText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Confirm Button
  confirmContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  confirmButton: {
    backgroundColor: '#FF5722',
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
