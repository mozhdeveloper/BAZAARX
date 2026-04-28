/**
 * useAddressForm.ts
 *
 * Custom hook that encapsulates shared address-form logic used by
 * AddressFormModal (and any future form that edits an Address).
 *
 * Responsibilities
 * ─────────────────
 * 1. makeBlankForm()     — Build a clean empty form (never pre-fills from DB)
 * 2. detectMetroManila() — Return true when lat/lng falls inside Metro Manila
 *                          bounding box or when reverse-geocoded data matches.
 * 3. checkDuplicate()    — Compare street + city + province (normalised) against
 *                          an existing address list, skipping the address being
 *                          edited.  Returns the conflicting address or null.
 */

import { useCallback } from 'react';
import type { Address } from '@/services/addressService';

// ---------------------------------------------------------------------------
// Metro Manila bounding box (approximate)
// Lat  13.90 – 14.88 | Lng  120.83 – 121.20
// ---------------------------------------------------------------------------
const METRO_MANILA_BOUNDS = {
  latMin: 13.9,
  latMax: 14.88,
  lngMin: 120.83,
  lngMax: 121.2,
};

/** Metro Manila city/municipality names used as a secondary heuristic. */
const METRO_CITIES = [
  'manila', 'quezon city', 'caloocan', 'las piñas', 'las pinas',
  'makati', 'malabon', 'mandaluyong', 'marikina', 'muntinlupa',
  'navotas', 'paranaque', 'parañaque', 'pasay', 'pasig', 'pateros',
  'san juan', 'taguig', 'valenzuela',
];

// ---------------------------------------------------------------------------
// Exported helpers (also usable outside the hook for pure-function tests)
// ---------------------------------------------------------------------------

/**
 * Return true when the given coordinates fall inside Metro Manila's
 * approximate bounding box.
 */
export function coordsInMetroManila(lat: number, lng: number): boolean {
  return (
    lat >= METRO_MANILA_BOUNDS.latMin &&
    lat <= METRO_MANILA_BOUNDS.latMax &&
    lng >= METRO_MANILA_BOUNDS.lngMin &&
    lng <= METRO_MANILA_BOUNDS.lngMax
  );
}

/**
 * Return true when a reverse-geocoded city/region string matches a
 * known Metro Manila city or contains "metro manila" / "ncr".
 */
export function reverseGeoMatchesMetroManila(
  geocodedCity: string,
  geocodedRegion: string,
): boolean {
  const city = geocodedCity.toLowerCase();
  const region = geocodedRegion.toLowerCase();

  if (
    region.includes('metro manila') ||
    region.includes('ncr') ||
    region.includes('national capital')
  ) {
    return true;
  }

  return METRO_CITIES.some(mc => city.includes(mc) || mc.includes(city));
}

/**
 * Normalise a string for duplicate comparison:
 * lower-case, strip non-alphanumeric, collapse whitespace.
 */
export function normalizeForCompare(s?: string): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface DuplicateCheckOptions {
  /** The full list of the user's saved addresses to compare against. */
  existingAddresses: Address[];
  /**
   * ID of the address currently being edited — skipped during comparison
   * so the user can save without a false "duplicate" error.
   */
  editingId?: string | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  /** The conflicting address, or null when no duplicate exists. */
  conflicting: Address | null;
}

export function useAddressForm() {
  /**
   * Check whether `candidate` duplicates an existing address.
   *
   * Duplicate rule: street + city + province all match (case / punctuation
   * insensitive) — regardless of label.
   */
  const checkDuplicate = useCallback(
    (
      candidate: Pick<Address, 'street' | 'city' | 'province'>,
      { existingAddresses, editingId }: DuplicateCheckOptions,
    ): DuplicateCheckResult => {
      const cStreet = normalizeForCompare(candidate.street);
      const cCity = normalizeForCompare(candidate.city);
      const cProvince = normalizeForCompare(candidate.province);

      // Nothing to check if the address is still mostly empty
      if (!cStreet && !cCity) {
        return { isDuplicate: false, conflicting: null };
      }

      const conflicting = existingAddresses.find(addr => {
        // Skip the address currently being edited
        if (editingId && addr.id === editingId) return false;

        const aStreet = normalizeForCompare(addr.street);
        const aCity = normalizeForCompare(addr.city);
        const aProvince = normalizeForCompare(addr.province);

        return aStreet === cStreet && aCity === cCity && aProvince === cProvince;
      }) ?? null;

      return { isDuplicate: conflicting !== null, conflicting };
    },
    [],
  );

  /**
   * Check whether `candidate` label duplicates an existing address label.
   *
   * Returns the conflicting address or null.
   */
  const checkLabelDuplicate = useCallback(
    (
      label: string,
      { existingAddresses, editingId }: DuplicateCheckOptions,
    ): Address | null => {
      if (!label.trim()) return null;
      const normalizedLabel = label.trim().toLowerCase();

      return (
        existingAddresses.find(addr => {
          if (editingId && addr.id === editingId) return false;
          return (addr.label ?? '').trim().toLowerCase() === normalizedLabel;
        }) ?? null
      );
    },
    [],
  );

  return { checkDuplicate, checkLabelDuplicate };
}
