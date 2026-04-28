/**
 * useAddressSearch
 *
 * Manages forward-geocoding queries against the Nominatim OSM API.
 * Features:
 *  - 400 ms debounce so we don't spam the API on every keystroke
 *  - Explicit loading / error / results states
 *  - Philippines country-code filter (`countrycodes=ph`)
 *  - Request cancellation via AbortController on unmount or new query
 *
 * Usage:
 *   const { results, isLoading, error, search, clear } = useAddressSearch();
 *   search("Quezon City");           // triggers debounced fetch
 *   clear();                         // reset to initial state
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface AddressSearchResult {
  /** Nominatim place_id (unique within a single response) */
  placeId: number;
  /** Human-readable display label */
  displayName: string;
  lat: number;
  lon: number;
  /** Raw OSM address breakdown (road, city, state, postcode, …) */
  address: Record<string, string>;
}

interface UseAddressSearchReturn {
  results: AddressSearchResult[];
  isLoading: boolean;
  error: string | null;
  /** Trigger a debounced search. Pass an empty string to clear results. */
  search: (query: string) => void;
  /** Immediately clear results, error, and any in-flight request. */
  clear: () => void;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const DEBOUNCE_MS = 400;
const MAX_RESULTS = 6;

export function useAddressSearch(): UseAddressSearchReturn {
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hold refs so effects don't stale-close over them
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debounceRef.current && clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const clear = useCallback(() => {
    debounceRef.current && clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setResults([]);
    setIsLoading(false);
    setError(null);
  }, []);

  const search = useCallback((query: string) => {
    // Immediately clear stale data when the query changes
    debounceRef.current && clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = new URL(NOMINATIM_BASE);
        url.searchParams.set("format", "json");
        url.searchParams.set("q", query);
        url.searchParams.set("countrycodes", "ph");
        url.searchParams.set("limit", String(MAX_RESULTS));
        url.searchParams.set("addressdetails", "1");

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            // Required by Nominatim's usage policy
            "Accept-Language": "en",
          },
        });

        if (!res.ok) throw new Error(`Network error: ${res.status}`);

        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          setResults([]);
          setError("No results found. Try a different search term.");
        } else {
          setResults(
            data.map((item: any) => ({
              placeId: item.place_id,
              displayName: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon),
              address: item.address ?? {},
            }))
          );
          setError(null);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return; // Intentional cancel — ignore
        console.error("[useAddressSearch] Fetch failed:", err);
        setError("Could not reach the search service. Check your connection.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  return { results, isLoading, error, search, clear };
}
