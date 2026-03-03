import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { Navigation, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

// Fix for Leaflet icons
const icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Helper component to move map view
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center, map.getZoom() < 16 ? 16 : map.getZoom());
    return null;
}

interface MapPickerProps {
    onConfirm: (data: any) => void;
    onCancel: () => void;
    initialCoords?: { lat: number; lng: number };
}

export const MapPicker = ({ onConfirm, onCancel, initialCoords }: MapPickerProps) => {
    // Check if we have valid saved coordinates (not the 0,0 default)
    const hasValidCoords = initialCoords && initialCoords.lat !== 0 && initialCoords.lng !== 0;

    const [position, setPosition] = useState<[number, number] | null>(
        hasValidCoords ? [initialCoords.lat, initialCoords.lng] : null
    );
    const [searchQuery, setSearchQuery] = useState("");

    const handleReverseGeocode = async (lat: number, lng: number) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await res.json();
            return data.address;
        } catch (error) {
            console.error("Geocoding error", error);
            return null;
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}&countrycodes=ph&limit=1`);
        const data = await res.json();
        if (data.length > 0) {
            const { lat, lon } = data[0];
            setPosition([parseFloat(lat), parseFloat(lon)]);
        }
    };

    const MapEvents = () => {
        useMapEvents({
            click(e) { setPosition([e.latlng.lat, e.latlng.lng]); },
        });
        return null;
    };

    const onFinalize = async () => {
        if (!position) {
            console.error("MapPicker: No position selected");
            return;
        }

        try {
            const addressDetails = await handleReverseGeocode(position[0], position[1]);
            onConfirm({
                lat: position[0],
                lng: position[1],
                address: addressDetails
            });
        } catch (error) {
            console.error("MapPicker: Error during finalization", error);
        }
    };

    const handleMyLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (p) => {
                const newPos: [number, number] = [p.coords.latitude, p.coords.longitude];
                setPosition(newPos);
            },
            (err) => {
                console.error("MapPicker: GPS Error", err.message);
                alert("Could not get your location. Please check your browser permissions.");
            }
        );
    };

    // Determine the initial center and zoom
    const mapCenter: [number, number] = hasValidCoords
        ? [initialCoords.lat, initialCoords.lng]
        : [12.8797, 121.7740];
    const mapZoom = hasValidCoords ? 16 : 6;

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
            {/* Top Search Bar */}
            <div className="p-4 border-b flex gap-2 bg-white">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search for a place or street..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <Button onClick={handleSearch} className="bg-[var(--brand-primary)]">Search</Button>
            </div>

            <div className="flex-1 relative">
                {/* Dynamically set center and zoom based on previous data */}
                <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {position && <Marker position={position} icon={icon} />}
                    {position && <ChangeView center={position} />}
                    <MapEvents />
                </MapContainer>

                <Button
                    variant="secondary"
                    className="absolute bottom-10 right-4 z-[1000] rounded-full shadow-xl"
                    onClick={handleMyLocation}
                >
                    <Navigation className="w-4 h-4 mr-2" /> My Location
                </Button>
            </div>

            {/* Footer Controls */}
            <div className="p-4 border-t flex gap-3 bg-white">
                <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button className="flex-1 bg-[var(--brand-primary)] text-white" disabled={!position} onClick={onFinalize}>
                    <Check className="w-4 h-4 mr-2" /> Confirm Location
                </Button>
            </div>
        </div>
    );
};