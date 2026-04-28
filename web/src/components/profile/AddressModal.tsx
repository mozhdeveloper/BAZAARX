import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Map as MapIcon, LocateFixed, Check, ArrowLeft } from "lucide-react"; import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  regions,
  provinces,
  cities,
  barangays,
} from "select-philippines-address";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/stores/buyerStore";
import { MapPicker } from "../../components/ui/MapPicker";

// Removes duplicate data from the PH address library
const unique = (arr: any[], key: string) => {
  return [...new Map(arr.map(item => [item[key], item])).values()];
};

// Safer string cleaner using word boundaries (\b)
const cleanStr = (s: string) => {
  if (!s) return "";
  return s.toLowerCase()
    .replace(/\bcity\b/gi, "")
    .replace(/\bof\b/gi, "")
    .replace(/\bdistrict\b/gi, "")
    .replace(/\bbarangay\b/gi, "")
    .replace(/\bbrgy\b/gi, "")
    .replace(/\bpob\b/gi, "")
    .replace(/[^a-z0-9]/g, "");
};

// Fuzzy match
const isMatch = (mapStr: string, libStr: string) => {
  const m = cleanStr(mapStr);
  const l = cleanStr(libStr);
  if (!m || !l) return false;
  if (m === l) return true;
  if (m.length > 3 && l.includes(m)) return true;
  if (l.length > 3 && m.includes(l)) return true;
  return false;
};

type AddressField = "label" | "firstName" | "lastName" | "phone" | "street" | "barangay" | "city" | "province" | "region" | "postalCode" | "country" | "landmark" | "deliveryInstructions";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Address;
  onAddressAdded: (address: Omit<Address, "id" | "fullName">) => Promise<boolean>;
  onAddressUpdated: (id: string, address: Partial<Address>) => Promise<boolean>;
}

export const AddressModal = ({ isOpen, onClose, address, onAddressAdded, onAddressUpdated }: AddressModalProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<AddressField, string>>>({});

  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isOtherLabel, setIsOtherLabel] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "", firstName: "", lastName: "", phone: "", street: "", barangay: "",
    city: "", province: "", region: "", postalCode: "", country: "Philippines",
    isDefault: false, landmark: "", deliveryInstructions: "", coordinates: { lat: 0, lng: 0 },
  });

  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (address) {
        setEditingId(address.id);
        const addrLabel = address.label || "";
        setNewAddress({
          ...address,
          label: addrLabel,
          country: address.country || "Philippines",
          landmark: address.landmark || "",
          deliveryInstructions: address.deliveryInstructions || "",
          coordinates: address.coordinates || { lat: 0, lng: 0 },
        });
        setIsOtherLabel(!!addrLabel && !["Home", "Office"].includes(addrLabel));
        hydrateAddressLists(address);
      } else {
        setEditingId(null);
        resetForm();
      }
    }
  }, [isOpen, address]);

  useEffect(() => {
    regions().then((res) => setRegionList(unique(res, 'region_code')));
  }, []);

  const resetForm = () => {
    setProvinceList([]); setCityList([]); setBarangayList([]); setErrors({});
    setIsOtherLabel(false);
    setNewAddress({
      label: "", firstName: "", lastName: "", phone: "", street: "", barangay: "",
      city: "", province: "", region: "", postalCode: "", country: "Philippines",
      isDefault: false, landmark: "", deliveryInstructions: "", coordinates: { lat: 0, lng: 0 },
    });
  };

  const updateField = <K extends AddressField>(key: K, value: string) => {
    setNewAddress((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      const nextErrors = { ...errors };
      delete nextErrors[key];
      setErrors(nextErrors);
    }
  };

  const validateAddress = () => {
    const nextErrors: Partial<Record<AddressField, string>> = {};
    if (!newAddress.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (!newAddress.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!newAddress.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (!newAddress.street.trim()) nextErrors.street = "Street address is required.";
    if (!newAddress.region.trim()) nextErrors.region = "Region is required.";
    if (!newAddress.province.trim()) nextErrors.province = "Province is required.";
    if (!newAddress.city.trim()) nextErrors.city = "City is required.";
    if (!newAddress.postalCode.trim()) nextErrors.postalCode = "Postal code is required.";
    return nextErrors;
  };

  const hydrateAddressLists = async (addr: Address) => {
    try {
      const allRegions = await regions();
      const regionMatch = allRegions.find((r) => r.region_name === addr.region);
      if (regionMatch) {
        const provs = await provinces(regionMatch.region_code);
        setProvinceList(unique(provs, 'province_code'));

        const provinceMatch = provs.find((p) => p.province_name === addr.province);
        if (provinceMatch) {
          const cts = await cities(provinceMatch.province_code);
          setCityList(unique(cts, 'city_code'));

          const cityMatch = cts.find((c) => c.city_name === addr.city);
          if (cityMatch) {
            const brgys = await barangays(cityMatch.city_code);
            setBarangayList(unique(brgys, 'brgy_name'));
          }
        }
      }
    } catch (error) {
      console.error("Hydration failed:", error);
    }
  };

  const handleMapConfirm = async (data: any) => {
    const { lat, lng, address } = data;
    if (!lat || !lng) return;

    try {
      const osmHints = [
        address?.city, address?.town, address?.municipality,
        address?.suburb, address?.quarter, address?.neighbourhood,
        address?.village, address?.county, address?.state_district,
        address?.state, address?.region, address?.province
      ].filter(Boolean).map(s => String(s));

      let finalRegion = "";
      let finalProvince = "";
      let finalCity = "";
      let finalBrgy = "";

      const allRegions = await regions();

      const regionMatch = allRegions.find(r =>
        osmHints.some(hint => isMatch(hint, r.region_name)) ||
        (osmHints.some(hint => hint.toLowerCase().includes("manila")) && r.region_name.toLowerCase().includes("national capital region"))
      );

      if (regionMatch) {
        finalRegion = regionMatch.region_name;
        const provs = await provinces(regionMatch.region_code);
        const uniqueProvs = unique(provs, 'province_code');
        setProvinceList(uniqueProvs);

        let provinceMatch;
        let cityMatch;
        let uniqueCts: any[] = [];

        for (const p of uniqueProvs) {
          const tempCities = await cities(p.province_code);
          const found = tempCities.find(c => osmHints.some(hint => isMatch(hint, c.city_name)));
          if (found) {
            provinceMatch = p;
            cityMatch = found;
            uniqueCts = unique(tempCities, 'city_code');
            break;
          }
        }

        if (!provinceMatch) {
          provinceMatch = uniqueProvs.find(p => osmHints.some(hint => isMatch(hint, p.province_name)));
          if (provinceMatch) {
            const cts = await cities(provinceMatch.province_code);
            uniqueCts = unique(cts, 'city_code');
            cityMatch = uniqueCts.find(c => osmHints.some(hint => isMatch(hint, c.city_name)));
          }
        }

        if (!provinceMatch && uniqueProvs.length > 0) {
          provinceMatch = uniqueProvs[0];
          const cts = await cities(provinceMatch.province_code);
          uniqueCts = unique(cts, 'city_code');
        }

        if (provinceMatch) {
          finalProvince = provinceMatch.province_name;
          setCityList(uniqueCts);

          if (cityMatch) {
            finalCity = cityMatch.city_name;
            const brgys = await barangays(cityMatch.city_code);
            const uniqueBrgys = unique(brgys, 'brgy_name');
            setBarangayList(uniqueBrgys);

            const brgyMatch = uniqueBrgys.find(b => osmHints.some(hint => isMatch(hint, b.brgy_name)));
            if (brgyMatch) finalBrgy = brgyMatch.brgy_name;
          }
        }
      }

      setNewAddress(prev => ({
        ...prev,
        coordinates: { lat, lng },
        street: address?.road || address?.pedestrian || address?.highway || prev.street,
        landmark: address?.amenity || address?.shop || address?.building || prev.landmark,
        postalCode: address?.postcode || prev.postalCode,
        region: finalRegion || prev.region,
        province: finalProvince || prev.province,
        city: finalCity || prev.city,
        barangay: finalBrgy || prev.barangay,
      }));

      setIsMapOpen(false);
      toast({ title: "Map Pinned", description: "Address fields have been populated." });
    } catch (err) {
      console.error("Autofill matching failed:", err);
      setNewAddress(prev => ({ ...prev, coordinates: { lat, lng } }));
      setIsMapOpen(false);
    }
  };

  const onRegionChange = (regionCode: string) => {
    const name = regionList.find((i) => i.region_code === regionCode)?.region_name;
    setNewAddress({ ...newAddress, region: name || "", province: "", city: "", barangay: "" });
    setErrors((prev) => ({ ...prev, region: undefined, province: undefined, city: undefined }));
    provinces(regionCode).then((res) => setProvinceList(unique(res, 'province_code')));
    setCityList([]); setBarangayList([]);
  };

  const onProvinceChange = (provinceCode: string) => {
    const name = provinceList.find((i) => i.province_code === provinceCode)?.province_name;
    setNewAddress({ ...newAddress, province: name || "", city: "", barangay: "" });
    setErrors((prev) => ({ ...prev, province: undefined, city: undefined }));
    cities(provinceCode).then((res) => setCityList(unique(res, 'city_code')));
    setBarangayList([]);
  };

  const onCityChange = (cityCode: string) => {
    const name = cityList.find((i) => i.city_code === cityCode)?.city_name;
    setNewAddress({ ...newAddress, city: name || "", barangay: "" });
    setErrors((prev) => ({ ...prev, city: undefined }));
    barangays(cityCode).then((res) => setBarangayList(unique(res, 'brgy_name')));
  };

  const handleSaveAddress = async () => {
    const nextErrors = validateAddress();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updated = await onAddressUpdated(editingId, {
          ...newAddress,
          country: newAddress.country,
          id: editingId,
          fullName: `${newAddress.firstName} ${newAddress.lastName}`,
        } as unknown as Address);
        if (!updated) throw new Error("Failed to update address");
      } else {
        const added = await onAddressAdded({ ...newAddress, country: newAddress.country });
        if (!added) throw new Error("Failed to add address");
      }

      onClose();
      setEditingId(null);
      setErrors({});
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* FLEX COL & OVERFLOW-HIDDEN: This makes the modal a rigid box 
        so the middle section scrolls while the header and footer stick.
      */}
      <DialogContent className="sm:max-w-[550px] p-0 max-h-[90vh] flex flex-col overflow-hidden border-0 shadow-2xl rounded-2xl bg-white">

        {/* HEADER: Locked at the top */}
        <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b border-gray-100 flex flex-row items-center gap-3 space-y-0">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
            {editingId ? "Edit Address" : "Add Address"}
          </DialogTitle>
        </DialogHeader>

        {/* BODY: Scrollable area */}
        <div className="px-6 overflow-y-auto flex-1 grid gap-5 py-5">
          {isMapOpen && (
            <MapPicker
              onConfirm={handleMapConfirm}
              onCancel={() => setIsMapOpen(false)}
              initialCoords={newAddress.coordinates}
            />
          )}

          {/* Pick from Map Section */}
          <div className="bg-[#FFFDF9] border border-[#FDECC8] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MapIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-[15px] text-gray-900 leading-tight">Pick from Map</h4>
                  <p className="text-[13px] text-gray-500 mt-0.5">Use GPS or search for your location</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsMapOpen(true)}
                className="border-[#F97316] text-[#F97316] hover:bg-[#F97316] hover:text-white hover:border-[#F97316] active:scale-95 h-9 px-4 shrink-0 rounded-lg font-medium shadow-sm transition-all duration-150"
              >
                <LocateFixed className="w-4 h-4 mr-2" />
                {newAddress.coordinates.lat !== 0 ? "Change Pin" : "Open Map"}
              </Button>
            </div>

            {newAddress.coordinates.lat !== 0 && (
              <>
                <hr className="my-3 border-[#FDECC8]" />
                <div className="flex items-center gap-1.5 text-[#10B981]">
                  <Check className="w-4 h-4" />
                  <span className="text-[13px] font-medium tracking-wide">
                    Location selected: {newAddress.coordinates.lat.toFixed(4)}, {newAddress.coordinates.lng.toFixed(4)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">First Name</Label>
              <Input
                value={newAddress.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="border-gray-200 h-11 rounded-lg focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:border-[#F97316]"
              />
              {errors.firstName && <p className="text-xs text-red-500 font-medium">{errors.firstName}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Last Name</Label>
              <Input
                value={newAddress.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="border-gray-200 h-11 rounded-lg focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:border-[#F97316]"
              />
              {errors.lastName && <p className="text-xs text-red-500 font-medium">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Phone Number</Label>
              <Input
                value={newAddress.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="border-gray-200 h-11 rounded-lg focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:border-[#F97316]"
              />
              {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Address Label</Label>
              <div className="flex gap-2 h-11 w-full">
                {!isOtherLabel ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsOtherLabel(false);
                        updateField("label", "Home");
                      }}
                      className={`flex-1 rounded-lg h-full px-0 transition-all duration-150 ${
                        !isOtherLabel && newAddress.label === "Home"
                          ? "bg-[#F97316] border-[#F97316] text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-[#F97316] hover:border-[#F97316] hover:text-white"
                      }`}
                    >
                      Home
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsOtherLabel(false);
                        updateField("label", "Office");
                      }}
                      className={`flex-1 rounded-lg h-full px-0 transition-all duration-150 ${
                        !isOtherLabel && newAddress.label === "Office"
                          ? "bg-[#F97316] border-[#F97316] text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-[#F97316] hover:border-[#F97316] hover:text-white"
                      }`}
                    >
                      Office
                    </Button>
                  </>
                ) : (
                  <Input
                    placeholder="e.g. School, Gym"
                    value={newAddress.label}
                    onChange={(e) => updateField("label", e.target.value)}
                    className="flex-1 h-full rounded-lg border-gray-200 px-3 text-[13px] focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:border-[#F97316] transition-all animate-in fade-in zoom-in-95"
                    autoFocus
                  />
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (isOtherLabel) {
                      setIsOtherLabel(false);
                      updateField("label", "");
                    } else {
                      setIsOtherLabel(true);
                      if (["Home", "Office"].includes(newAddress.label)) {
                        updateField("label", "");
                      }
                    }
                  }}
                  className={`px-3 shrink-0 rounded-lg h-full transition-all duration-150 ${
                    isOtherLabel
                      ? "bg-[#F97316] border-[#F97316] text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-[#F97316] hover:border-[#F97316] hover:text-white"
                  }`}
                >
                  {isOtherLabel ? "Cancel" : "Other"}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-gray-700">Street Name, House No.</Label>
            <Input
              value={newAddress.street}
              onChange={(e) => updateField("street", e.target.value)}
              className="border-gray-200 h-11 rounded-lg focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:border-[#F97316]"
            />
            {errors.street && <p className="text-xs text-red-500 font-medium">{errors.street}</p>}
          </div>

          {/* Full Width Region */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-gray-700">Region</Label>
            <Select value={regionList.find((r) => r.region_name === newAddress.region)?.region_code || ""} onValueChange={onRegionChange}>
              <SelectTrigger className="border-gray-200 h-11 rounded-lg focus:ring-1 focus:ring-[#F97316]">
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-60">
                {regionList.map((r) => (
                  <SelectItem key={r.region_code} value={r.region_code}>{r.region_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Full Width Province */}
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-gray-700">Province</Label>
            <Select value={provinceList.find((p) => p.province_name === newAddress.province)?.province_code || ""} onValueChange={onProvinceChange} disabled={!provinceList.length}>
              <SelectTrigger className="border-gray-200 h-11 rounded-lg focus:ring-1 focus:ring-[#F97316]">
                <SelectValue placeholder="Select Province" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-60">
                {provinceList.map((p) => (
                  <SelectItem key={p.province_code} value={p.province_code}>{p.province_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">City / Municipality</Label>
              <Select value={cityList.find((c) => c.city_name === newAddress.city)?.city_code || ""} onValueChange={onCityChange} disabled={!cityList.length}>
                <SelectTrigger className="border-gray-200 h-11 rounded-lg focus:ring-1 focus:ring-[#F97316]">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-60">
                  {cityList.map((c) => (
                    <SelectItem key={c.city_code} value={c.city_code}>{c.city_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Barangay</Label>
              <Select disabled={!barangayList.length} value={newAddress.barangay || ""} onValueChange={(val) => updateField("barangay", val)}>
                <SelectTrigger className="border-gray-200 h-11 rounded-lg focus:ring-1 focus:ring-[#F97316]">
                  <SelectValue placeholder="Select Barangay" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-xl max-h-60">
                  {barangayList.map((b) => (
                    <SelectItem key={b.brgy_code || b.brgy_name} value={b.brgy_name}>{b.brgy_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Postal Code</Label>
              <Input
                value={newAddress.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
                className="border-gray-200 h-11 rounded-lg focus-visible:ring-1 focus-visible:ring-[#F97316] focus-visible:border-[#F97316]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium text-gray-700">Country</Label>
              <Input
                value={newAddress.country}
                disabled
                className="bg-gray-50 border-gray-200 h-11 rounded-lg text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 pb-2">
            <Switch id="default-addr" checked={newAddress.isDefault} onCheckedChange={(c) => setNewAddress({ ...newAddress, isDefault: c })} className="data-[state=checked]:bg-[#E87A15]" />
            <Label htmlFor="default-addr" className="font-medium text-gray-700 cursor-pointer">Set as Default Address</Label>
          </div>
        </div>

        {/* STICKY FOOTER: Locked at the bottom */}
        <DialogFooter className="px-6 py-4 shrink-0 bg-white border-t border-gray-100 flex flex-row w-full rounded-b-2xl gap-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1 text-gray-900 text-[15px] font-medium hover:bg-gray-100 h-11"
          >
            Back
          </Button>
          <Button
            onClick={handleSaveAddress}
            disabled={isSaving}
            className="flex-1 bg-[#E87A15] hover:bg-[#D96B0E] text-white text-[15px] h-11 rounded-lg font-semibold shadow-sm transition-all"
          >
            {isSaving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {editingId ? "Update Address" : "Save Address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};