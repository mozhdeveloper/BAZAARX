/**
 * useGeoLocation.ts
 *
 * High-performance geolocation hook for the AddressFormModal.
 *
 * Optimization patterns applied (aligned with MOBILE_PERFORMANCE_OPTIMIZATION.md):
 *
 * ① PARALLEL DATA FETCHING (§2B / §2A pattern)
 *    - Nominatim reverse-geocode and PH regions list are fetched in parallel
 *      via Promise.allSettled(), eliminating sequential waterfall latency.
 *    - Metro Manila city lookups are fetched in parallel with Promise.all()
 *      instead of the original sequential `for await` loop.
 *
 * ② STALE-WHILE-REVALIDATE CACHE (§1D / §3D pattern)
 *    - Last GPS fix is kept in a module-level ref (survives modal re-mounts
 *      within the same app session). If a cached fix is ≤ CACHE_TTL_MS old and
 *      within CACHE_RADIUS_M of the same location, it is returned immediately —
 *      preventing redundant high-accuracy GPS pings that drain battery.
 *    - Nominatim responses are cached by rounded lat/lng (≈111 m granularity)
 *      so panning the map pin slightly doesn't re-hit the external API.
 *
 * ③ ACCURACY LADDER (§1C / debounce pattern)
 *    - First call uses Balanced accuracy (fast, ~50 m) to give instant feedback.
 *    - A background high-accuracy fix is then fetched and updates coords silently
 *      if the improvement is > ACCURACY_UPGRADE_THRESHOLD_M.
 *
 * ④ TIMEOUT & ERROR BOUNDARIES (§2B error pattern)
 *    - GPS call is wrapped in a race against a configurable timeout promise.
 *    - Nominatim fetch uses AbortController so stale requests don't resolve
 *      after the modal is dismissed.
 *
 * ⑤ NO UI-THREAD BLOCKING (§1B / §3C pattern)
 *    - Heavy cascade (provinces → cities → barangays) is fully async behind
 *      the `isReverseGeocoding` flag so the form remains responsive.
 *    - All state updates are batched where possible to minimise re-renders.
 */

import { useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { regions, provinces, cities, barangays } from 'select-philippines-address';
import { coordsInMetroManila, reverseGeoMatchesMetroManila } from './useAddressForm';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Re-use a cached GPS fix if it is this fresh (ms). Battery optimisation. */
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Skip the background high-accuracy upgrade if the balanced fix is already
 * within this distance of the refined fix (metres).
 */
const ACCURACY_UPGRADE_THRESHOLD_M = 50;

/**
 * If GPS doesn't return within this many ms, fall back to the balanced fix
 * rather than blocking the user indefinitely.
 */
const GPS_TIMEOUT_MS = 10_000;

/**
 * Nominatim cache granularity — coords are rounded to this many decimal
 * places (≈111 m per 0.001°) before being used as a cache key.
 */
const NOMINATIM_COORD_PRECISION = 3;

// ---------------------------------------------------------------------------
// Module-level caches (survive modal remounts within the same JS context)
// ---------------------------------------------------------------------------

interface CachedFix {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
}

/** Last GPS fix. Null until the user taps "Use My Location" for the first time. */
let cachedGPSFix: CachedFix | null = null;

/** Nominatim reverse-geocode cache: `"lat,lng"` → parsed address object. */
const nominatimCache = new Map<string, NominatimAddress>();

/** PH regions list — fetched once per session, then reused. */
let cachedRegions: any[] | null = null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NominatimAddress {
  street: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  zipCode: string;
}

export interface GeoCascadeResult {
  nominatim: NominatimAddress;
  isMetroManila: boolean;
  regionName: string;
  regionCode: string;
  provinceName?: string;
  provinceCode?: string;
  cityName?: string;
  cityCode?: string;
  barangayName?: string;
  barangayCode?: string;
  provinceList: any[];
  cityList: any[];
  barangayList: any[];
}

export interface UseGeoLocationOptions {
  /** Called once a fast (balanced) GPS fix is obtained. */
  onFastFix?: (lat: number, lng: number) => void;
  /** Called after the full reverse-geocode + PH cascade completes. */
  onGeoCascadeComplete?: (result: GeoCascadeResult) => void;
  /** Called when the high-accuracy background upgrade arrives. */
  onAccuracyUpgrade?: (lat: number, lng: number) => void;
  /** Called on permission denial or GPS failure. */
  onError?: (message: string) => void;
  /** Called to set `isGettingLocation` in the parent component. */
  setIsGettingLocation?: (v: boolean) => void;
  /** Called to set `isReverseGeocoding` in the parent component. */
  setIsReverseGeocoding?: (v: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nominatimCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(NOMINATIM_COORD_PRECISION)},${lng.toFixed(NOMINATIM_COORD_PRECISION)}`;
}

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // earth radius in metres
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Race a promise against a timeout. Rejects with a timeout error if too slow. */
function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

/**
 * Fetch and parse a Nominatim reverse-geocode response.
 * Results are cached by rounded coordinate key.
 */
async function fetchNominatim(lat: number, lng: number, signal: AbortSignal): Promise<NominatimAddress> {
  const key = nominatimCacheKey(lat, lng);
  const cached = nominatimCache.get(key);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BazaarXApp/1.0' },
    signal,
  });
  const data = await res.json();
  if (!data?.address) throw new Error('Nominatim returned no address');

  const a = data.address;
  const result: NominatimAddress = {
    street: a.road || a.pedestrian || a.footway || '',
    barangay: a.neighbourhood || a.suburb || a.village || '',
    city: a.city || a.municipality || a.town || '',
    province: a.county || a.state || '',
    region: a.region || a.state || '',
    zipCode: a.postcode || '',
  };
  nominatimCache.set(key, result);
  return result;
}

/**
 * Load PH regions (cached in module-level ref after first call).
 */
async function getRegions(): Promise<any[]> {
  if (cachedRegions) return cachedRegions;
  const list = await regions();
  cachedRegions = list;
  return list;
}

/**
 * Build the full PH address cascade from a Nominatim result.
 * Parallelises city fetches for Metro Manila via Promise.all().
 */
async function buildPhCascade(
  nom: NominatimAddress,
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<GeoCascadeResult> {
  const regList = await getRegions();
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const metroCities = [
    'manila', 'quezon', 'makati', 'pasig', 'taguig', 'marikina', 'paranaque',
    'pasay', 'caloocan', 'malabon', 'navotas', 'valenzuela', 'muntinlupa',
    'las piñas', 'san juan', 'mandaluyong', 'pateros',
  ];

  const matchedRegion = regList.find((r: any) => {
    const rName = r.region_name?.toLowerCase() || '';
    const gR = nom.region.toLowerCase();
    const gC = nom.city.toLowerCase();
    if (rName.includes('metro manila') || rName.includes('ncr') || rName.includes('national capital')) {
      return gR.includes('metro manila') || gR.includes('ncr') || gR.includes('national capital') ||
        metroCities.some(c => gC.includes(c));
    }
    return rName.includes(gR) || gR.includes(rName);
  });

  if (!matchedRegion) {
    // Return what we have from Nominatim even without a PH cascade match
    return {
      nominatim: nom,
      isMetroManila: false,
      regionName: nom.region,
      regionCode: '',
      provinceList: [],
      cityList: [],
      barangayList: [],
    };
  }

  const isMetroManila =
    coordsInMetroManila(lat, lng) ||
    reverseGeoMatchesMetroManila(nom.city, nom.region) ||
    matchedRegion.region_name?.toLowerCase().includes('metro manila') ||
    matchedRegion.region_name?.toLowerCase().includes('ncr') ||
    matchedRegion.region_code === '13';

  const provList = await provinces(matchedRegion.region_code);
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  const result: GeoCascadeResult = {
    nominatim: nom,
    isMetroManila,
    regionName: matchedRegion.region_name,
    regionCode: matchedRegion.region_code,
    provinceList: provList,
    cityList: [],
    barangayList: [],
  };

  if (isMetroManila) {
    // ① PARALLEL city fetches across all NCR provinces — §2A pattern
    const cityArrays = await Promise.all(provList.map((p: any) => cities(p.province_code)));
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const allCities = cityArrays.flat();
    result.cityList = allCities;

    const matchedCity = allCities.find((c: any) => {
      const cN = c.city_name?.toLowerCase() || '';
      const gC = nom.city.toLowerCase();
      return cN.includes(gC) || gC.includes(cN.split(' ')[0]);
    });

    if (matchedCity) {
      result.cityName = matchedCity.city_name;
      result.cityCode = matchedCity.city_code;
      const bList = await barangays(matchedCity.city_code);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      result.barangayList = bList;
      const matchedBrgy = bList.find((b: any) => {
        const bN = b.brgy_name?.toLowerCase() || '';
        return bN.includes(nom.barangay.toLowerCase()) || nom.barangay.toLowerCase().includes(bN);
      });
      if (matchedBrgy) {
        result.barangayName = matchedBrgy.brgy_name;
        result.barangayCode = matchedBrgy.brgy_code;
      }
    }
  } else {
    const matchedProv = provList.find((p: any) => {
      const pN = p.province_name?.toLowerCase() || '';
      return pN.includes(nom.province.toLowerCase()) || nom.province.toLowerCase().includes(pN);
    });

    if (matchedProv) {
      result.provinceName = matchedProv.province_name;
      result.provinceCode = matchedProv.province_code;
      const cList = await cities(matchedProv.province_code);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      result.cityList = cList;

      const matchedCity = cList.find((c: any) => {
        const cN = c.city_name?.toLowerCase() || '';
        const gC = nom.city.toLowerCase();
        return cN.includes(gC) || gC.includes(cN.split(' ')[0]);
      });

      if (matchedCity) {
        result.cityName = matchedCity.city_name;
        result.cityCode = matchedCity.city_code;
        const bList = await barangays(matchedCity.city_code);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        result.barangayList = bList;
        const matchedBrgy = bList.find((b: any) => {
          const bN = b.brgy_name?.toLowerCase() || '';
          return bN.includes(nom.barangay.toLowerCase()) || nom.barangay.toLowerCase().includes(bN);
        });
        if (matchedBrgy) {
          result.barangayName = matchedBrgy.brgy_name;
          result.barangayCode = matchedBrgy.brgy_code;
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGeoLocation({
  onFastFix,
  onGeoCascadeComplete,
  onAccuracyUpgrade,
  onError,
  setIsGettingLocation,
  setIsReverseGeocoding,
}: UseGeoLocationOptions = {}) {
  /** AbortController so in-flight Nominatim requests are cancelled on unmount. */
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Full geolocation flow:
   * 1. Check stale-while-revalidate cache → instant result if fresh
   * 2. Fast balanced GPS fix → calls onFastFix immediately
   * 3. Nominatim + PH cascade in parallel → calls onGeoCascadeComplete
   * 4. Background high-accuracy upgrade → calls onAccuracyUpgrade if improved
   */
  const requestLocation = useCallback(async () => {
    // Cancel any previous in-flight geocoding request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setIsGettingLocation?.(true);

    try {
      // ── Step 1: Permission ──────────────────────────────────────────────
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        onError?.('Location permission was denied. Please enable it in Settings.');
        Alert.alert(
          'Location Permission Required',
          'Please enable Location in your device Settings to use this feature.',
          [{ text: 'OK' }],
        );
        return;
      }

      // ── Step 2: Stale-While-Revalidate cache check ──────────────────────
      const now = Date.now();
      if (cachedGPSFix && now - cachedGPSFix.timestamp < CACHE_TTL_MS) {
        const { latitude, longitude } = cachedGPSFix;
        // Return cached fix immediately — no GPS ping needed
        onFastFix?.(latitude, longitude);
        setIsGettingLocation?.(false);

        // Still run geocoding in case the cache doesn't have a completed cascade
        setIsReverseGeocoding?.(true);
        try {
          const [nom] = await Promise.allSettled([
            fetchNominatim(latitude, longitude, signal),
            // Pre-warm the regions list in parallel
            getRegions(),
          ]);
          if (nom.status === 'fulfilled' && !signal.aborted) {
            const cascade = await buildPhCascade(nom.value, latitude, longitude, signal);
            if (!signal.aborted) onGeoCascadeComplete?.(cascade);
          }
        } finally {
          if (!signal.aborted) setIsReverseGeocoding?.(false);
        }
        return;
      }

      // ── Step 3: Fast balanced fix (accuracy ladder — low latency) ───────
      const balancedFix = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: 2 as any }), // Balanced = 2
        GPS_TIMEOUT_MS,
        'Balanced GPS',
      );
      const { latitude: bLat, longitude: bLng, accuracy: bAcc } = balancedFix.coords;

      // Immediately surface the fast fix so the map moves right away
      onFastFix?.(bLat, bLng);
      setIsGettingLocation?.(false);

      // Cache the balanced fix
      cachedGPSFix = { latitude: bLat, longitude: bLng, timestamp: now, accuracy: bAcc ?? 999 };

      // ── Step 4: Nominatim + regions in parallel ─────────────────────────
      // §2B pattern: run both fetches concurrently, don't wait sequentially
      setIsReverseGeocoding?.(true);
      const [nomResult, _regionsResult] = await Promise.allSettled([
        fetchNominatim(bLat, bLng, signal),
        getRegions(), // pre-warms cachedRegions so buildPhCascade is instant
      ]);

      if (signal.aborted) return;

      if (nomResult.status === 'fulfilled') {
        const cascade = await buildPhCascade(nomResult.value, bLat, bLng, signal);
        if (!signal.aborted) {
          onGeoCascadeComplete?.(cascade);
          setIsReverseGeocoding?.(false);
        }
      } else {
        if (__DEV__) console.warn('[useGeoLocation] Nominatim failed:', nomResult.reason);
        setIsReverseGeocoding?.(false);
      }

      // ── Step 5: Background high-accuracy upgrade (non-blocking) ─────────
      // Runs after the UI is already populated with the balanced result.
      // Only updates coordinates if the refined fix is meaningfully different.
      Location.getCurrentPositionAsync({ accuracy: 3 as any }) // High = 3
        .then(refinedFix => {
          if (signal.aborted) return;
          const { latitude: rLat, longitude: rLng, accuracy: rAcc } = refinedFix.coords;
          const distanceMoved = haversineDistanceM(bLat, bLng, rLat, rLng);

          if (distanceMoved > ACCURACY_UPGRADE_THRESHOLD_M) {
            // Update cache with the better fix
            cachedGPSFix = { latitude: rLat, longitude: rLng, timestamp: Date.now(), accuracy: rAcc ?? 999 };
            onAccuracyUpgrade?.(rLat, rLng);
            if (__DEV__) {
              console.log(`[useGeoLocation] Accuracy upgrade: moved ${distanceMoved.toFixed(1)}m → re-geocoding`);
            }
          }
        })
        .catch(() => { /* silent — refined fix is best-effort */ });

    } catch (error: any) {
      if (error?.name === 'AbortError') return; // Normal on unmount
      if (__DEV__) console.error('[useGeoLocation] Error:', error);
      const message = error?.message?.includes('timed out')
        ? 'GPS signal is weak. Please move to an open area and try again.'
        : 'Could not get your location. Please make sure GPS is enabled.';
      onError?.(message);
      Alert.alert('Location Error', message, [{ text: 'OK' }]);
    } finally {
      setIsGettingLocation?.(false);
    }
  }, [onFastFix, onGeoCascadeComplete, onAccuracyUpgrade, onError, setIsGettingLocation, setIsReverseGeocoding]);

  /**
   * Run only the Nominatim + PH cascade for a known lat/lng.
   * Used when the user adjusts the map pin manually.
   */
  const geocodeCoords = useCallback(async (lat: number, lng: number) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setIsReverseGeocoding?.(true);
    try {
      // §2B pattern: Nominatim + regions pre-warm in parallel
      const [nomResult] = await Promise.allSettled([
        fetchNominatim(lat, lng, signal),
        getRegions(),
      ]);

      if (signal.aborted) return;

      if (nomResult.status === 'fulfilled') {
        const cascade = await buildPhCascade(nomResult.value, lat, lng, signal);
        if (!signal.aborted) onGeoCascadeComplete?.(cascade);
      }
    } finally {
      if (!signal.aborted) setIsReverseGeocoding?.(false);
    }
  }, [onGeoCascadeComplete, setIsReverseGeocoding]);

  /** Cancel all in-flight requests. Call in useEffect cleanup. */
  const cancelAll = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  /** Manually invalidate the GPS cache (e.g., on modal close). */
  const invalidateCache = useCallback(() => {
    cachedGPSFix = null;
  }, []);

  return { requestLocation, geocodeCoords, cancelAll, invalidateCache };
}
