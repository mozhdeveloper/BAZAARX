/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useBuyerStore } from "../stores/buyerStore";
import type { BuyerProfile } from "../stores/buyerStore";
import Header from "../components/Header";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { ChevronLeft, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ProfileInfoSection,
  ProfileSummarySection,
  AddressManagementSection,
  PaymentMethodsSection,
  FollowingSection,
  NotificationSettingsSection,
  AvatarUploadModal,
} from "@/components/profile";
import { useProfileManager } from "@/hooks/profile/useProfileManager";

export default function BuyerProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, followedShops, setProfile, updateProfile } = useBuyerStore();

  const userId = profile?.id || "";
  const { checkSellerStatus } = useProfileManager(userId);

  // 1. Load regions on mount
  useEffect(() => {
    regions().then((res) => setRegionList(res));
  }, []);

  // Check if user is also a seller
  useEffect(() => {
    const checkSellerStatus = async () => {
      if (profile?.id) {
        // Check if the user exists in the sellers table
        const { data, error } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking seller status:', error);
          setIsSeller(false);
        } else {
          setIsSeller(!!data);
        }
      }
    };
    checkSellerStatus();
  }, [profile?.id]);

  // 2. Handle Region Selection
  const onRegionChange = (regionCode: string) => {
    const name = regionList.find(i => i.region_code === regionCode)?.region_name;
    setNewAddress({ ...newAddress, region: name, province: '', city: '', barangay: '' });
    provinces(regionCode).then(res => setProvinceList(res));
    setCityList([]);
    setBarangayList([]);
  };

  // 3. Handle Province Selection
  const onProvinceChange = (provinceCode: string) => {
    const name = provinceList.find(i => i.province_code === provinceCode)?.province_name;
    setNewAddress({ ...newAddress, province: name, city: '', barangay: '' });
    cities(provinceCode).then(res => setCityList(res));
    setBarangayList([]);
  };

  // 4. Handle City Selection
  const onCityChange = (cityCode: string) => {
    const name = cityList.find(i => i.city_code === cityCode)?.city_name;
    setNewAddress({ ...newAddress, city: name, barangay: '' });
    barangays(cityCode).then(res => setBarangayList(res));
  };

  useEffect(() => {
    const loadAddresses = async () => {
      if (!profile?.id) return;
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', profile.id);

      if (data && !error) {
        setAddresses(data.map(addr => ({
          id: addr.id,
          label: addr.label,
          firstName: addr.first_name,
          lastName: addr.last_name,
          fullName: `${addr.first_name || ''} ${addr.last_name || ''}`.trim(),
          phone: addr.phone,
          street: addr.address_line_1 || addr.street || '',
          barangay: addr.barangay || '',
          city: addr.city,
          region: addr.region,
          province: addr.province,
          postalCode: addr.postal_code || addr.zip_code || '',
          isDefault: addr.is_default
        })));
      }
    };
    loadAddresses();
  }, [profile?.id]);

  // Profile Edit State
  const [editData, setEditData] = useState(profile || {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: ''
  });

  const handleOpenEdit = () => {
    if (profile) {
      setEditData({ ...profile });
    }
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);

  const handleUpdatePreferences = async (
    preferences: BuyerProfile["preferences"],
  ) => {
    try {
      await updateProfile({ preferences } as Partial<BuyerProfile>);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.message || "Could not upload image.",
        variant: "destructive"
      });
    }
  };

  // Address
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: 'NCR',
    postalCode: '',
    isDefault: false
  });

  const handleOpenAddressModal = async (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      setNewAddress({ ...address });

      // 1. Re-populate the lists based on existing names
      try {
        // Find Region Code by Name
        const allRegions = await regions();
        const regionMatch = allRegions.find(r => r.region_name === address.region);

        if (regionMatch) {
          // Load Provinces for this region
          const provs = await provinces(regionMatch.region_code);
          setProvinceList(provs);
          const provinceMatch = provs.find(p => p.province_name === address.province);

          if (provinceMatch) {
            // Load Cities for this province
            const cts = await cities(provinceMatch.province_code);
            setCityList(cts);
            const cityMatch = cts.find(c => c.city_name === address.city);

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
    } else {
      // Reset for New Address
      setEditingId(null);
      setProvinceList([]);
      setCityList([]);
      setBarangayList([]);
      setNewAddress({
        label: 'Home', firstName: profile?.firstName || '', lastName: profile?.lastName || '',
        phone: profile?.phone || '', street: '', barangay: '', city: '',
        province: '', region: '', postalCode: '', isDefault: addresses.length === 0
      });
    }
    setIsAddressOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!profile) return;
    setIsSaving(true);

    try {
      const { supabase } = await import('../lib/supabase');

      // 1. Handle Default logic in DB
      if (newAddress.isDefault) {
        await supabase
          .from('shipping_addresses')
          .update({ is_default: false })
          .eq('user_id', profile.id);

        const updatedLocalAddresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        setAddresses(updatedLocalAddresses);
      }

      const dbPayload = {
        user_id: profile.id,
        label: newAddress.label,
        first_name: newAddress.firstName,
        last_name: newAddress.lastName,
        phone: newAddress.phone,
        street: newAddress.street,
        region: newAddress.region,
        province: newAddress.province,
        city: newAddress.city,
        barangay: newAddress.barangay,
        zip_code: newAddress.postalCode,
        is_default: newAddress.isDefault,
      };

      if (editingId) {
        // UPDATING EXISTING ROW
        const { error } = await supabase
          .from('shipping_addresses')
          .update(dbPayload)
          .eq('id', editingId); // Ensure this ID matches the DB primary key

        if (error) throw error;

        // Update local Zustand store
        updateAddress(editingId, {
          ...newAddress,
          id: editingId,
          fullName: `${newAddress.firstName} ${newAddress.lastName}`
        } as any);

        toast({ title: "Address updated" });
      } else {
        // ADDING NEW ROW
        const { data, error } = await supabase
          .from('shipping_addresses')
          .insert([dbPayload])
          .select()
          .single();

        if (error) throw error;

        // Add to local Zustand store
        addAddress({
          ...newAddress,
          id: data.id,
          fullName: `${data.first_name} ${data.last_name}`
        } as any);

        toast({ title: "Address added" });
      }

      setIsAddressOpen(false);
      setEditingId(null); // Reset the state for the next use
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    // Optional: Add a confirmation dialog here
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const { supabase } = await import('../lib/supabase');

      // 1. Delete from Supabase Database
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      // 2. Delete from Local Zustand Store
      deleteAddress(addressId);

      toast({
        title: "Address deleted",
        description: "The address has been removed from your profile.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting address",
        description: error.message,
        variant: "destructive",
      });
      console.error(error);
    }
  };

  const handleAvatarUpdated = async (avatarUrl: string) => {
    if (!profile) return;

    setProfile({ ...profile, avatar: avatarUrl });

    try {
      const { supabase } = await import('../lib/supabase');

      // 2. Unset all defaults for this user
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', profile.id);

      // 3. Set new default
      const { error } = await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      toast({
        title: "Default Address Updated",
        description: "Your primary shipping address has been updated.",
      });
    } catch (error) {
      toast({
        title: "Unable to update avatar",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      console.error(error);
    }
  };

  useEffect(() => {
    if (!userId) {
      setIsSellerLoading(false);
      return;
    }

    let isActive = true;

    const loadSellerStatus = async () => {
      try {
        setIsSellerLoading(true);
        const sellerStatus = await checkSellerStatus();
        if (isActive) {
          setIsSeller(sellerStatus);
        }
      } catch (error) {
        if (isActive) {
          toast({
            title: "Unable to check seller status",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        }
        console.error(error);
      } finally {
        if (isActive) {
          setIsSellerLoading(false);
        }
      }
    };

    loadSellerStatus();

    return () => {
      isActive = false;
    };
  }, [userId, checkSellerStatus, toast]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Custom Profile Header - Modern Dark Orange Style */}
      <div className="relative bg-[#2b1203]/70 pt-8 pb-10 overflow-hidden">
        {/* Background Image with Dark Orange Overlay */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-center bg-cover opacity-45 scale-110 blur-sm"
            style={{ backgroundImage: `url(${profile.avatar})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2b1200]/50 via-[#4d2000]/50 to-[#7a3300]/20" />
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-white/10 px-3 -ml-2 text-white/80 hover:text-white transition-all rounded-full backdrop-blur-md bg-white/5"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
            {/* Profile Avatar */}
            <div
              className="relative group cursor-pointer"
              onClick={() => setIsEditModalOpen(true)}
            >
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white p-1 shadow-2xl overflow-hidden ring-4 ring-white/10">
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="absolute bottom-1 right-1 bg-white text-[#ff6a00] p-1.5 rounded-full shadow-lg border-2 border-[#ff6a00]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 text-center md:text-left mt-6 -mb-6">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  {profile.firstName} {profile.lastName}
                </h1>
                <Badge className="bg-white text-[#ff6a00] hover:bg-white border-none py-0.5 px-3 flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Verified Member
                </Badge>
              </div>

              <div className="flex flex-col gap-1 mb-5">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/80 text-sm font-medium">
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {profile.phone}
                  </span>
                </div>

                {/* Profile Stats - Styled like Seller Storefront */}
                <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">
                      {profile.totalOrders || 0}
                    </span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-base font-bold">
                        {profile.bazcoins || 0}
                      </span>
                      <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                        Bazcoins
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">
                      {followedShops.length}
                    </span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                      Following
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  try {
                    setIsSellerLoading(true);
                    const sellerStatus = await checkSellerStatus({
                      force: true,
                    });
                    if (sellerStatus) {
                      navigate("/seller");
                    } else {
                      navigate("/seller/auth");
                    }
                  } catch (error) {
                    toast({
                      title: "Unable to open seller area",
                      description: "Please try again in a moment.",
                      variant: "destructive",
                    });
                    console.error(error);
                  } finally {
                    setIsSellerLoading(false);
                  }
                }}
                disabled={isSellerLoading}
                className="bg-[#ff6a00] hover:bg-[#e65e00] text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-2"
              >
                <Store className="w-4 h-4" />
                {isSellerLoading
                  ? "Checking status..."
                  : isSeller
                    ? "Switch to Seller Mode"
                    : "Start Selling"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-12 relative z-20">
        {/* Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="-mt-4 space-y-4"
        >
          <div className="sticky top-20 z-30 flex justify-center w-full mb-4 py-2 backdrop-blur-[2px]">
            <TabsList className="inline-flex h-auto items-center justify-center rounded-full bg-gray-100/80 p-1 shadow-sm">
              <TabsTrigger
                value="personal"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Personal Info
              </TabsTrigger>
              <TabsTrigger
                value="addresses"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Addresses
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Payment Methods
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-full px-8 py-1.5 text-sm font-medium text-gray-500 data-[state=active]:bg-white data-[state=active]:text-[#ff6a00] data-[state=active]:shadow-sm transition-all"
              >
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Personal Content Layout */}
          <TabsContent value="personal">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <ProfileInfoSection profile={profile} />
              <ProfileSummarySection profile={profile} />
            </motion.div>
          </TabsContent>

          {/* Addresses Content */}
          <TabsContent value="addresses">
            <AddressManagementSection userId={userId} />
          </TabsContent>

          <TabsContent value="following">
            <FollowingSection />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentMethodsSection userId={userId} />
          </TabsContent>

          <TabsContent value="settings">
            <NotificationSettingsSection
              profile={profile}
              onUpdatePreferences={handleUpdatePreferences}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Modal */}
      <AvatarUploadModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onAvatarUpdated={handleAvatarUpdated}
      />
    </div>
  );
}
