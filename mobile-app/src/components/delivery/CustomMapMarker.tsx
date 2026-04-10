import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { CheckCircle, Truck, MapPin } from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import type { Checkpoint } from '../../data/delivery/static-checkpoints';

interface CustomMapMarkerProps {
  checkpoint: Checkpoint;
  index: number;
  onPress?: (checkpoint: Checkpoint) => void;
}

export default function CustomMapMarker({ checkpoint, index, onPress }: CustomMapMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (checkpoint.status === 'current') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [checkpoint.status]);

  const getMarkerColor = () => {
    switch (checkpoint.status) {
      case 'completed':
        return '#10B981'; // Green
      case 'current':
        return COLORS.primary; // Orange/Amber
      case 'pending':
        return '#9CA3AF'; // Gray
      default:
        return '#9CA3AF';
    }
  };

  const getMarkerIcon = () => {
    const size = 20;
    switch (checkpoint.status) {
      case 'completed':
        return <CheckCircle size={size} color="#FFFFFF" strokeWidth={2.5} />;
      case 'current':
        return <Truck size={size} color="#FFFFFF" strokeWidth={2.5} />;
      case 'pending':
        return <MapPin size={size} color="#FFFFFF" strokeWidth={2.5} />;
      default:
        return <MapPin size={size} color="#FFFFFF" strokeWidth={2.5} />;
    }
  };

  const coordinate = {
    latitude: checkpoint.lat,
    longitude: checkpoint.lng,
  };

  return (
    <Marker
      coordinate={coordinate}
    >
      <View style={styles.markerContainer}>
        {/* Pulsing ring for current marker */}
        {checkpoint.status === 'current' && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: opacityAnim,
              },
            ]}
          />
        )}

        {/* Marker Circle */}
        <View
          style={[
            styles.markerCircle,
            {
              backgroundColor: getMarkerColor(),
              shadowColor: getMarkerColor(),
            },
          ]}
        >
          {getMarkerIcon()}
        </View>

        {/* Status Badge */}
        {checkpoint.status === 'current' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>LIVE</Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
  },
  markerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statusBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
