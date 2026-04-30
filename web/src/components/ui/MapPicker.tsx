/**
 * MapPicker (upgraded)
 *
 * Changes over the previous version:
 *  ① Search bar now uses `useAddressSearch` → debounced, shows loading spinner
 *    and a proper dropdown of results instead of jumping to limit=1.
 *  ② Dropdown is keyboard-accessible (ArrowUp/Down + Enter/Escape).
 *  ③ "Confirm Location" button is disabled until a pin is placed AND
 *    has been reverse-geocoded (i.e. `resolvedAddress` is set).
 *  ④ A subtle "Locating…" spinner appears while GPS is resolving.
 *  ⑤ Error states for both search and reverse-geocode are surfaced inline.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Navigation, Search, Check, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAddressSearch, type AddressSearchResult } from "@/hooks/useAddressSearch";

// ── Leaflet icon fix ──────────────────────────────────────────────────────────
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ── Sub-component: smoothly re-centres the map ────────────────────────────────
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom() < 16 ? 16 : map.getZoom());
  return null;
}

// ── Sub-component: listens for map clicks ─────────────────────────────────────
function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MapPickerProps {
  onConfirm: (data: { lat: number; lng: number; address: Record<string, string> | null }) => void;
  onCancel: () => void;
  initialCoords?: { lat: number; lng: number };
}

// ── Component ─────────────────────────────────────────────────────────────────
export const MapPicker = ({ onConfirm, onCancel, initialCoords }: MapPickerProps) => {
  const hasValidCoords =
    initialCoords && initialCoords.lat !== 0 && initialCoords.lng !== 0;

  // ── Position state ──────────────────────────────────────────────────────────
  const [position, setPosition] = useState<[number, number] | null>(
    hasValidCoords ? [initialCoords.lat, initialCoords.lng] : null
  );

  /**
   * resolvedAddress: set only after a successful reverse-geocode.
   * This is the validation gate — "Confirm Location" stays disabled until set.
   */
  const [resolvedAddress, setResolvedAddress] = useState<Record<string, string> | null>(
    hasValidCoords ? {} : null // pre-existing pin is assumed valid
  );

  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // ── Search state (from hook) ────────────────────────────────────────────────
  const { results, isLoading: isSearchLoading, error: searchError, search, clear } = useAddressSearch();

  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  // Keep dropdown in sync with results
  useEffect(() => {
    setIsDropdownOpen(results.length > 0 || isSearchLoading || !!searchError);
    setFocusedIndex(-1);
  }, [results, isSearchLoading, searchError]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Reverse-geocode a lat/lng and update resolvedAddress */
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    setReverseError(null);
    setResolvedAddress(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      setResolvedAddress(data.address ?? {});
    } catch {
      setReverseError("Could not resolve this location. Try a different spot.");
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  /** Called when user clicks on the map */
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      reverseGeocode(lat, lng);
      setIsDropdownOpen(false);
    },
    [reverseGeocode]
  );

  /** Called when user picks a result from the dropdown */
  const handleSelectResult = useCallback(
    (result: AddressSearchResult) => {
      const newPos: [number, number] = [result.lat, result.lon];
      setPosition(newPos);
      setResolvedAddress(result.address);      // search result already has address details
      setSearchQuery(result.displayName);
      setIsDropdownOpen(false);
      clear();
    },
    [clear]
  );

  /** Handle keyboard navigation inside the dropdown */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && results[focusedIndex]) {
        handleSelectResult(results[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  /** Use GPS */
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const newPos: [number, number] = [p.coords.latitude, p.coords.longitude];
        setPosition(newPos);
        reverseGeocode(p.coords.latitude, p.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        console.error("GPS error:", err.message);
        alert("Could not get your location. Please check browser permissions.");
        setIsLocating(false);
      }
    );
  };

  /** Final confirmation */
  const onFinalize = () => {
    if (!position || !resolvedAddress) return;
    onConfirm({ lat: position[0], lng: position[1], address: resolvedAddress });
  };

  // ── Map defaults ────────────────────────────────────────────────────────────
  const mapCenter: [number, number] = hasValidCoords
    ? [initialCoords.lat, initialCoords.lng]
    : [12.8797, 121.774];
  const mapZoom = hasValidCoords ? 16 : 6;

  const isConfirmDisabled =
    !position || !resolvedAddress || isReverseGeocoding;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="p-3 border-b bg-white shadow-sm flex gap-2 items-start">
        <div className="relative flex-1">
          {/* Icon: spinner while loading, search icon otherwise */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {isSearchLoading ? (
              <Loader2 className="h-4 w-4 text-[var(--brand-primary)] animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </span>

          <Input
            ref={searchInputRef}
            placeholder="Search for a place or street…"
            className="pl-9 pr-8 h-10 rounded-lg border-gray-200 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)]"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              search(e.target.value);
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => results.length > 0 && setIsDropdownOpen(true)}
            aria-autocomplete="list"
            aria-controls="address-search-results"
            aria-expanded={isDropdownOpen}
            role="combobox"
            autoComplete="off"
          />

          {/* Clear button */}
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => {
                setSearchQuery("");
                clear();
                setIsDropdownOpen(false);
                searchInputRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* ── Dropdown ────────────────────────────────────────────────────── */}
          {isDropdownOpen && (
            <ul
              id="address-search-results"
              ref={dropdownRef}
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[200] max-h-60 overflow-y-auto divide-y divide-gray-50"
            >
              {/* Loading skeleton rows */}
              {isSearchLoading && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <li key={i} className="px-4 py-3 animate-pulse flex gap-3 items-center">
                      <span className="h-3 w-3/4 bg-gray-200 rounded" />
                    </li>
                  ))}
                </>
              )}

              {/* Error message */}
              {!isSearchLoading && searchError && (
                <li className="px-4 py-3 text-sm text-gray-500 italic flex items-center gap-2">
                  <span className="text-amber-500">⚠</span> {searchError}
                </li>
              )}

              {/* Results */}
              {!isSearchLoading &&
                !searchError &&
                results.map((result, idx) => (
                  <li
                    key={result.placeId}
                    role="option"
                    aria-selected={idx === focusedIndex}
                    className={`px-4 py-3 cursor-pointer text-sm transition-colors ${
                      idx === focusedIndex
                        ? "bg-orange-50 text-[var(--brand-primary)]"
                        : "text-gray-700 hover:bg-orange-50 hover:text-[var(--brand-primary)]"
                    }`}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    onClick={() => handleSelectResult(result)}
                  >
                    <p className="font-medium line-clamp-1">{result.address?.road || result.displayName.split(",")[0]}</p>
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{result.displayName}</p>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* GPS button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleMyLocation}
          disabled={isLocating}
          className="h-10 px-3 shrink-0 border-gray-200 text-gray-600 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
          title="Use my current location"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {position && <Marker position={position} icon={markerIcon} />}
          {position && <ChangeView center={position} />}
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>

        {/* Inline feedback overlay — shown while reverse-geocoding */}
        {(isReverseGeocoding || reverseError) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-gray-200 rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm">
            {isReverseGeocoding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />
                <span className="text-gray-600">Resolving address…</span>
              </>
            ) : (
              <>
                <span className="text-amber-500">⚠</span>
                <span className="text-gray-600">{reverseError}</span>
              </>
            )}
          </div>
        )}

        {/* Resolved address chip */}
        {position && resolvedAddress && !isReverseGeocoding && !reverseError && (
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="bg-white border border-green-200 rounded-xl px-4 py-2.5 shadow-lg flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                {resolvedAddress.road
                  ? `${resolvedAddress.road}${resolvedAddress.suburb ? ", " + resolvedAddress.suburb : ""}${resolvedAddress.city ? ", " + resolvedAddress.city : ""}`
                  : "Location pinned — address resolved."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="p-4 border-t flex gap-3 bg-white">
        <Button
          type="button"
          variant="ghost"
          className="flex-1 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="button"
          className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isConfirmDisabled}
          onClick={onFinalize}
          title={!position ? "Pin a location first" : isReverseGeocoding ? "Resolving address…" : ""}
        >
          {isReverseGeocoding ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          {isReverseGeocoding ? "Resolving…" : "Confirm Location"}
        </Button>
      </div>
    </div>
  );
};