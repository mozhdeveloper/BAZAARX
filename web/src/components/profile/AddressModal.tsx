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
import { Loader2 } from "lucide-react";
import {
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

type AddressField =
  | "label"
  | "firstName"
  | "lastName"
  | "phone"
  | "street"
  | "barangay"
  | "city"
  | "province"
  | "region"
  | "postalCode"
  | "country";

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: Address;
  onAddressAdded: (
    address: Omit<Address, "id" | "fullName">,
  ) => Promise<boolean>;
  onAddressUpdated: (id: string, address: Partial<Address>) => Promise<boolean>;
}

export const AddressModal = ({
  isOpen,
  onClose,
  address,
  onAddressAdded,
  onAddressUpdated,
}: AddressModalProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<AddressField, string>>>(
    {},
  );

  const [newAddress, setNewAddress] = useState({
    label: "Home",
    firstName: "",
    lastName: "",
    phone: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    region: "",
    postalCode: "",
    country: "Philippines",
    isDefault: false,
  });

  const [regionList, setRegionList] = useState<
    Array<{ region_code: string; region_name: string }>
  >([]);
  const [provinceList, setProvinceList] = useState<
    Array<{ province_code: string; province_name: string }>
  >([]);
  const [cityList, setCityList] = useState<
    Array<{ city_code: string; city_name: string }>
  >([]);
  const [barangayList, setBarangayList] = useState<
    Array<{ brgy_code: string; brgy_name: string }>
  >([]);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      if (address) {
        setEditingId(address.id);
        setNewAddress({
          ...address,
          country: address.country || "Philippines",
        });
        hydrateAddressLists(address);
      } else {
        setEditingId(null);
        resetForm();
      }
    }
  }, [isOpen, address]);

  // Load regions on mount
  useEffect(() => {
    regions().then((res) => setRegionList(res));
  }, []);

  const resetForm = () => {
    setProvinceList([]);
    setCityList([]);
    setBarangayList([]);
    setErrors({});
    setNewAddress({
      label: "Home",
      firstName: "",
      lastName: "",
      phone: "",
      street: "",
      barangay: "",
      city: "",
      province: "",
      region: "",
      postalCode: "",
      country: "Philippines",
      isDefault: false,
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
    const phonePattern = /^\+?\d{10,13}$/;
    const postalPattern = /^\d{4,6}$/;

    if (!newAddress.firstName.trim())
      nextErrors.firstName = "First name is required.";
    if (!newAddress.lastName.trim())
      nextErrors.lastName = "Last name is required.";
    if (!newAddress.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (!phonePattern.test(newAddress.phone.replace(/\s+/g, ""))) {
      nextErrors.phone = "Enter a valid phone number.";
    }
    if (!newAddress.street.trim())
      nextErrors.street = "Street address is required.";
    if (!newAddress.region.trim()) nextErrors.region = "Region is required.";
    if (!newAddress.province.trim())
      nextErrors.province = "Province is required.";
    if (!newAddress.city.trim()) nextErrors.city = "City is required.";
    if (!newAddress.postalCode.trim()) {
      nextErrors.postalCode = "Postal code is required.";
    } else if (!postalPattern.test(newAddress.postalCode.trim())) {
      nextErrors.postalCode = "Enter a valid postal code.";
    }

    return nextErrors;
  };

  const hydrateAddressLists = async (address: Address) => {
    try {
      // Find Region Code by Name
      const allRegions = await regions();
      const regionMatch = allRegions.find(
        (r) => r.region_name === address.region,
      );

      if (regionMatch) {
        // Load Provinces for this region
        const provs = await provinces(regionMatch.region_code);
        setProvinceList(provs);
        const provinceMatch = provs.find(
          (p) => p.province_name === address.province,
        );

        if (provinceMatch) {
          // Load Cities for this province
          const cts = await cities(provinceMatch.province_code);
          setCityList(cts);
          const cityMatch = cts.find((c) => c.city_name === address.city);

          if (cityMatch) {
            // Load Barangays for this city
            const brgys = await barangays(cityMatch.city_code);
            setBarangayList(brgys);
          }
        }
      }
    } catch (error) {
      console.error("Error re-hydrating address lists:", error);
    }
  };

  // Handle Region Selection
  const onRegionChange = (regionCode: string) => {
    const name = regionList.find(
      (i) => i.region_code === regionCode,
    )?.region_name;
    setNewAddress({
      ...newAddress,
      region: name || "",
      province: "",
      city: "",
      barangay: "",
    });
    setErrors((prev) => ({
      ...prev,
      region: undefined,
      province: undefined,
      city: undefined,
    }));
    provinces(regionCode).then((res) => setProvinceList(res));
    setCityList([]);
    setBarangayList([]);
  };

  // Handle Province Selection
  const onProvinceChange = (provinceCode: string) => {
    const name = provinceList.find(
      (i) => i.province_code === provinceCode,
    )?.province_name;
    setNewAddress({
      ...newAddress,
      province: name || "",
      city: "",
      barangay: "",
    });
    setErrors((prev) => ({
      ...prev,
      province: undefined,
      city: undefined,
    }));
    cities(provinceCode).then((res) => setCityList(res));
    setBarangayList([]);
  };

  // Handle City Selection
  const onCityChange = (cityCode: string) => {
    const name = cityList.find((i) => i.city_code === cityCode)?.city_name;
    setNewAddress({ ...newAddress, city: name || "", barangay: "" });
    setErrors((prev) => ({
      ...prev,
      city: undefined,
    }));
    barangays(cityCode).then((res) => setBarangayList(res));
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
        if (!updated) {
          throw new Error("Failed to update address");
        }

        toast({ title: "Address updated" });
      } else {
        const added = await onAddressAdded({
          ...newAddress,
          country: newAddress.country,
        });
        if (!added) {
          throw new Error("Failed to add address");
        }

        toast({ title: "Address added" });
      }

      onClose();
      setEditingId(null);
      setErrors({});
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit Address" : "Add Shipping Address"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newAddress.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newAddress.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Phone and Label */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newAddress.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Address Label</Label>
              <Input
                placeholder="Home, Office, etc."
                value={newAddress.label}
                onChange={(e) => updateField("label", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Street Name, House No. <span className="text-red-500">*</span>
            </Label>
            <Input
              value={newAddress.street}
              onChange={(e) => updateField("street", e.target.value)}
            />
            {errors.street && (
              <p className="text-xs text-red-500">{errors.street}</p>
            )}
          </div>

          {/* Region and Province */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Region <span className="text-red-500">*</span>
              </Label>
              <Select
                value={
                  regionList.find((r) => r.region_name === newAddress.region)
                    ?.region_code
                }
                onValueChange={onRegionChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  {regionList.map((r) => (
                    <SelectItem key={r.region_code} value={r.region_code}>
                      {r.region_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Province <span className="text-red-500">*</span>
              </Label>
              <Select
                value={
                  provinceList.find(
                    (p) => p.province_name === newAddress.province,
                  )?.province_code
                }
                onValueChange={onProvinceChange}
                disabled={!provinceList.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Province" />
                </SelectTrigger>
                <SelectContent>
                  {provinceList.map((p) => (
                    <SelectItem key={p.province_code} value={p.province_code}>
                      {p.province_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.region && (
            <p className="text-xs text-red-500">{errors.region}</p>
          )}
          {errors.province && (
            <p className="text-xs text-red-500">{errors.province}</p>
          )}

          {/* City and Barangay */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                City / Municipality <span className="text-red-500">*</span>
              </Label>
              <Select
                value={
                  cityList.find((c) => c.city_name === newAddress.city)
                    ?.city_code
                }
                onValueChange={onCityChange}
                disabled={!cityList.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  {cityList.map((c) => (
                    <SelectItem key={c.city_code} value={c.city_code}>
                      {c.city_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Barangay</Label>
              <Select
                disabled={!barangayList.length}
                value={newAddress.barangay}
                onValueChange={(val) => updateField("barangay", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Barangay" />
                </SelectTrigger>
                <SelectContent>
                  {barangayList.map((b) => (
                    <SelectItem key={b.brgy_code} value={b.brgy_name}>
                      {b.brgy_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}

          {/* Postal Code & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Postal Code <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newAddress.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
              />
              {errors.postalCode && (
                <p className="text-xs text-red-500">{errors.postalCode}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>
                Country <span className="text-red-500">*</span>
              </Label>
              <Input value={newAddress.country} disabled />
            </div>
          </div>

          {/* Default Switch */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-8">
              <Switch
                id="default-addr"
                checked={newAddress.isDefault}
                onCheckedChange={(checked) =>
                  setNewAddress({ ...newAddress, isDefault: checked })
                }
              />
              <Label htmlFor="default-addr">Set as Default</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAddress}
            disabled={isSaving || Object.keys(validateAddress()).length > 0}
            className="bg-[#ff6a00] hover:bg-[#e65e00] text-white"
          >
            {isSaving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            {editingId ? "Update Address" : "Save Address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
