// Type declarations for react-native-maps
// These types extend what's provided by the package to resolve TypeScript issues

declare module 'react-native-maps' {
  import { Component } from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export interface MapViewProps {
    style?: StyleProp<ViewStyle>;
    region?: Region;
    initialRegion?: Region;
    onRegionChange?: (region: Region) => void;
    onRegionChangeComplete?: (region: Region) => void;
    showsUserLocation?: boolean;
    showsMyLocationButton?: boolean;
    scrollEnabled?: boolean;
    zoomEnabled?: boolean;
    rotateEnabled?: boolean;
    pitchEnabled?: boolean;
    provider?: 'google' | null;
    children?: React.ReactNode;
  }

  export interface MarkerProps {
    coordinate: LatLng;
    title?: string;
    description?: string;
    children?: React.ReactNode;
  }

  export const PROVIDER_GOOGLE: 'google';
  export const PROVIDER_DEFAULT: null;

  export class Marker extends Component<MarkerProps> {}
  
  export default class MapView extends Component<MapViewProps> {
    animateToRegion(region: Region, duration?: number): void;
  }
}

// Expo Location type declarations
declare module 'expo-location' {
  export interface LocationObject {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number | null;
      altitudeAccuracy: number | null;
      heading: number | null;
      speed: number | null;
    };
    timestamp: number;
  }

  export interface PermissionResponse {
    status: 'granted' | 'denied' | 'undetermined';
    canAskAgain: boolean;
    granted: boolean;
    expires: 'never' | number;
  }

  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function getCurrentPositionAsync(options?: object): Promise<LocationObject>;
  export function reverseGeocodeAsync(location: { latitude: number; longitude: number }): Promise<any[]>;
}

// Expo Print type declarations
declare module 'expo-print' {
  export interface PrintOptions {
    html?: string;
    uri?: string;
    width?: number;
    height?: number;
    base64?: boolean;
  }

  export interface FilePrintResult {
    uri: string;
    base64?: string;
    numberOfPages?: number;
  }

  export function printAsync(options: PrintOptions): Promise<void>;
  export function printToFileAsync(options: PrintOptions): Promise<FilePrintResult>;
}
