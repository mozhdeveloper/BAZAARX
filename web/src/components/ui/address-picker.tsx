import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Search, Loader2, X, Check, LocateFixed } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom orange marker icon
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface AddressPickerProps {
  initialCoordinates?: { lat: number; lng: number };
  onLocationSelect: (location: {
    coordinates: { lat: number; lng: number };
    address: string;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
    postalCode?: string;
  }) => void;
  onClose?: () => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    village?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    postcode?: string;
    country?: string;
  };
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function AddressPicker({ initialCoordinates, onLocationSelect, onClose }: AddressPickerProps) {
  // Default to Manila, Philippines if no coordinates provided
  const defaultCenter: [number, number] = initialCoordinates 
    ? [initialCoordinates.lat, initialCoordinates.lng]
    : [14.5995, 120.9842];
  
  const [position, setPosition] = useState<[number, number]>(defaultCenter);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addressDetails, setAddressDetails] = useState<{
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
    postalCode?: string;
  }>({});
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'BazaarPH/1.0'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        setSelectedAddress(data.display_name);
        setAddressDetails({
          street: data.address?.road || data.address?.pedestrian || '',
          barangay: data.address?.neighbourhood || data.address?.suburb || data.address?.village || '',
          city: data.address?.city || data.address?.municipality || data.address?.town || '',
          province: data.address?.county || data.address?.state || '',
          region: data.address?.region || data.address?.state || '',
          postalCode: data.address?.postcode || '',
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Search for location using Nominatim
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&addressdetails=1&limit=5`,
        {
          headers: {
            'User-Agent': 'BazaarPH/1.0'
          }
        }
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      searchLocation(value);
    }, 500);
  };

  // Select search result
  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition([lat, lng]);
    setSelectedAddress(result.display_name);
    setAddressDetails({
      street: result.address?.road || '',
      barangay: result.address?.neighbourhood || result.address?.suburb || result.address?.village || '',
      city: result.address?.city || result.address?.municipality || '',
      province: result.address?.county || result.address?.state || '',
      region: result.address?.region || result.address?.state || '',
      postalCode: result.address?.postcode || '',
    });
    setShowResults(false);
    setSearchQuery('');
  };

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'Unable to get your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        alert(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [reverseGeocode]);

  // Confirm selection
  const handleConfirm = () => {
    onLocationSelect({
      coordinates: { lat: position[0], lng: position[1] },
      address: selectedAddress,
      ...addressDetails
    });
  };

  // Initial reverse geocode if we have coordinates
  useEffect(() => {
    if (initialCoordinates) {
      reverseGeocode(initialCoordinates.lat, initialCoordinates.lng);
    }
  }, [initialCoordinates, reverseGeocode]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            <h3 className="font-bold text-lg">Select Location</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search for a location..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="pl-10 pr-10 bg-white text-gray-900 border-0 focus-visible:ring-2 focus-visible:ring-white/50"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border max-h-60 overflow-y-auto z-[1000]">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectResult(result)}
                  className="w-full px-4 py-3 text-left hover:bg-orange-50 border-b last:border-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 line-clamp-2">{result.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative" style={{ minHeight: '350px', height: '350px', width: '100%' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <MapContainer
            center={position}
            zoom={15}
            className="h-full w-full"
            zoomControl={false}
            style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position} icon={orangeIcon} />
            <MapClickHandler onLocationSelect={handleMapClick} />
            <MapRecenter center={position} />
          </MapContainer>
        </div>

        {/* Auto-locate Button */}
        <button
          onClick={getCurrentLocation}
          disabled={isLocating}
          className={cn(
            "absolute bottom-4 right-4 z-[1000] bg-white rounded-full p-3 shadow-lg",
            "hover:bg-gray-50 transition-all border border-gray-200",
            isLocating && "opacity-70"
          )}
          title="Use my current location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5 text-orange-500" />
          )}
        </button>

        {/* Map Instructions */}
        <div className="absolute top-4 left-4 right-16 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-orange-500" />
            Tap on the map to select a location, or use the locate button
          </p>
        </div>

        {/* Loading Overlay */}
        {isReverseGeocoding && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              <span className="text-sm text-gray-600">Finding address...</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      <div className="p-4 border-t bg-gray-50">
        <Label className="text-xs text-gray-500 mb-1 block">Selected Location</Label>
        {selectedAddress ? (
          <div className="bg-white rounded-lg p-3 border border-gray-200 mb-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 line-clamp-2">{selectedAddress}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 border border-dashed border-gray-300 mb-3 text-center">
            <p className="text-sm text-gray-400">Tap on the map to select a location</p>
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={!selectedAddress || isReverseGeocoding}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5"
        >
          <Check className="w-4 h-4 mr-2" />
          Confirm Location
        </Button>
      </div>
    </div>
  );
}

export default AddressPicker;
