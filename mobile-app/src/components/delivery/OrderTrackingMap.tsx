import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Platform,
  Dimensions,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Truck, MapPin, Navigation } from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import CustomMapMarker from './CustomMapMarker';
import type { Checkpoint, CheckpointRoute } from '../../data/delivery/static-checkpoints';

interface OrderTrackingMapProps {
  origin?: { lat: number; lng: number; label: string };
  destination?: { lat: number; lng: number; label: string };
  checkpoints?: Checkpoint[];
  currentStep?: number;
  courierLocation?: { lat: number; lng: number };
  showCourierMarker?: boolean;
  onMarkerPress?: (checkpoint: Checkpoint) => void;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_WIDTH * 0.75; // 75% of screen width

export default function OrderTrackingMap({
  origin,
  destination,
  checkpoints = [],
  currentStep = 0,
  courierLocation,
  showCourierMarker = false,
  onMarkerPress,
  height = MAP_HEIGHT,
}: OrderTrackingMapProps) {
  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);

  // Calculate map region to fit all checkpoints
  const calculateRegion = useCallback((): Region => {
    const allPoints = [
      ...(origin ? [{ lat: origin.lat, lng: origin.lng }] : []),
      ...(destination ? [{ lat: destination.lat, lng: destination.lng }] : []),
      ...checkpoints.map(cp => ({ lat: cp.lat, lng: cp.lng })),
      ...(courierLocation ? [{ lat: courierLocation.lat, lng: courierLocation.lng }] : []),
    ];

    if (allPoints.length === 0) {
      // Default to Manila
      return {
        latitude: 14.5995,
        longitude: 120.9842,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }

    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Add padding to the region (20% extra)
    const latDelta = (maxLat - minLat) * 1.4 || 0.0922;
    const lngDelta = (maxLng - minLng) * 1.4 || 0.0421;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  }, [origin, destination, checkpoints, courierLocation]);

  // Fit map to show all checkpoints when data changes
  useEffect(() => {
    if (mapRef.current && checkpoints.length > 0) {
      const region = calculateRegion();
      mapRef.current.animateToRegion(region, 1000);
    }
  }, [checkpoints, calculateRegion]);

  // Handle marker press
  const handleMarkerPress = useCallback((checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    onMarkerPress?.(checkpoint);
  }, [onMarkerPress]);

  // Calculate route points for polyline
  const getRoutePoints = useCallback(() => {
    const points = checkpoints.map(cp => ({
      latitude: cp.lat,
      longitude: cp.lng,
    }));

    // Add origin and destination if not in checkpoints
    if (origin && !points.some(p => p.latitude === origin.lat && p.longitude === origin.lng)) {
      points.unshift({ latitude: origin.lat, longitude: origin.lng });
    }

    if (destination && !points.some(p => p.latitude === destination.lat && p.longitude === destination.lng)) {
      points.push({ latitude: destination.lat, longitude: destination.lng });
    }

    return points;
  }, [checkpoints, origin, destination]);

  // Generate intermediate points for smoother polyline
  const generateSmoothRoute = useCallback((points: Array<{ latitude: number; longitude: number }>) => {
    const smoothPoints: Array<{ latitude: number; longitude: number }> = [];
    const stepsBetween = 10;

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];

      for (let j = 0; j <= stepsBetween; j++) {
        const lat = start.latitude + (end.latitude - start.latitude) * (j / stepsBetween);
        const lng = start.longitude + (end.longitude - start.longitude) * (j / stepsBetween);
        smoothPoints.push({ latitude: lat, longitude: lng });
      }
    }

    return smoothPoints;
  }, []);

  // Split route points into completed and pending
  const getSubRoutePoints = useCallback(() => {
    const points = getRoutePoints();
    
    // The index in 'points' corresponding to the first checkpoint is 1 (if origin is at 0)
    // Map 'currentStep' to the correct index in the 'points' array
    // points[0] = origin
    // points[1...n] = checkpoints
    // currentStep 0 means checkpoints[0] is current.
    // So completed is points[0] to points[1].
    const currentIndexInPoints = currentStep + 1;
    
    const completedPart = points.slice(0, currentIndexInPoints + 1);
    const pendingPart = points.slice(currentIndexInPoints);
    
    return {
      completed: generateSmoothRoute(completedPart),
      pending: generateSmoothRoute(pendingPart)
    };
  }, [currentStep, getRoutePoints, generateSmoothRoute]);

  const { completed, pending } = getSubRoutePoints();

  // Premium minimal map style (Soft Amber/Gray)
  const mapStyle = [
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#f5f5f5" }]
    },
    {
      "elementType": "labels.icon",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#616161" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#f5f5f5" }]
    },
    {
      "featureType": "administrative.land_parcel",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#bdbdbd" }]
    },
    {
      "featureType": "poi",
      "elementType": "geometry",
      "stylers": [{ "color": "#eeeeee" }]
    },
    {
      "featureType": "poi",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{ "color": "#e5e5e5" }]
    },
    {
      "featureType": "road",
      "elementType": "geometry",
      "stylers": [{ "color": "#ffffff" }]
    },
    {
      "featureType": "road.arterial",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#dadada" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#616161" }]
    },
    {
      "featureType": "road.local",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#9e9e9e" }]
    },
    {
      "featureType": "transit.line",
      "elementType": "geometry",
      "stylers": [{ "color": "#e5e5e5" }]
    },
    {
      "featureType": "transit.station",
      "elementType": "geometry",
      "stylers": [{ "color": "#eeeeee" }]
    },
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#c9c9c9" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#9e9e9e" }]
    }
  ];

  return (
    <View style={[styles.container, { height }]}>
      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={calculateRegion()}
        showsUserLocation={false}
        showsMyLocationButton={false}
        scrollEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        {...({ customMapStyle: mapStyle } as any)}
      >
        {/* Origin Marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
          >
            <View style={styles.originMarker}>
              <MapPin size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          >
            <View style={styles.destinationMarker}>
              <Navigation size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Marker>
        )}

        {/* Checkpoint Markers */}
        {checkpoints.map((checkpoint, index) => (
          <CustomMapMarker
            key={checkpoint.id}
            checkpoint={checkpoint}
            index={index}
            onPress={handleMarkerPress}
          />
        ))}

        {/* Courier Location Marker (for Phase 3) */}
        {showCourierMarker && courierLocation && (
          <Marker
            coordinate={{ latitude: courierLocation.lat, longitude: courierLocation.lng }}
          >
            <View style={styles.courierMarker}>
              <Truck size={24} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </Marker>
        )}

        {/* Completed Path - Solid Amber */}
        {completed.length > 1 && (
          <Polyline
            coordinates={completed}
            strokeColor={COLORS.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Pending Path - Dashed/Lighter Gray */}
        {pending.length > 1 && (
          <Polyline
            coordinates={pending}
            strokeColor="#9CA3AF"
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
            lineDashPattern={[5, 5]} // Dash pattern for visual distinction
          />
        )}
      </MapView>

      {/* Selected Checkpoint Info Card */}
      {selectedCheckpoint && (
        <Pressable
          style={styles.infoCard}
          onPress={() => setSelectedCheckpoint(null)}
        >
          <View style={styles.infoCardContent}>
            <View style={styles.infoCardHeader}>
              <View style={[
                styles.infoCardIcon,
                { backgroundColor: selectedCheckpoint.status === 'completed' ? '#10B981' :
                    selectedCheckpoint.status === 'current' ? COLORS.primary : '#9CA3AF' }
              ]}>
                <MapPin size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.infoCardTitle}>{selectedCheckpoint.label}</Text>
            </View>
            {selectedCheckpoint.time && (
              <Text style={styles.infoCardTime}>{selectedCheckpoint.time}</Text>
            )}
          </View>
        </Pressable>
      )}

      {/* Map Controls Overlay */}
      <View style={styles.mapControls}>
        {/* Status Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Current</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Origin Marker
  originMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Destination Marker
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Courier Marker
  courierMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },

  // Info Card
  infoCard: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  infoCardContent: {
    gap: 8,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCardTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 44,
  },

  // Map Controls
  mapControls: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  legend: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});
