/**
 * Geocoding Utility
 * 
 * Provides helper functions for forward and reverse geocoding
 * using the Nominatim OpenStreetMap API.
 */

export interface ReverseGeocodeResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: Record<string, string>;
  boundingbox: string[];
}

/**
 * Fetches the human-readable address for a given pair of coordinates.
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise<ReverseGeocodeResult>
 */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      // Required by Nominatim's usage policy
      'User-Agent': 'BAZAARX-Web-App'
    }
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.statusText}`);
  }

  return await response.json();
}
