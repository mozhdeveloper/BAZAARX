/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Address, useBuyerStore } from '../stores/buyerStore';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Lock,
  Star,
  ShoppingBag,
  Gift,
  Heart,
  Edit2,
  Camera,
  Loader2,
  Package,
  Plus,
  Trash2,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { regions, provinces, cities, barangays } from "select-philippines-address";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BuyerProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { profile, updateProfile, addresses, followedShops, setAddresses, addAddress, updateAddress } = useBuyerStore();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  // 1. Load regions on mount
  useEffect(() => {
    regions().then((res) => setRegionList(res));
  }, []);

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
        .from('addresses')
        .select('*')
        .eq('user_id', profile.id);

      if (data && !error) {
        setAddresses(data.map(addr => ({
          id: addr.id,
          label: addr.label,
          firstName: addr.first_name,
          lastName: addr.last_name,
          fullName: `${addr.first_name} ${addr.last_name}`,
          phone: addr.phone,
          street: addr.street,
          barangay: addr.barangay,
          city: addr.city,
          region: addr.region,
          province: addr.province,
          postalCode: addr.zip_code,
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

    try {
      const updates = {
        first_name: editData.firstName, // Assuming DB column mapping
        last_name: editData.lastName,
        phone: editData.phone,
        avatar_url: editData.avatar,
        updated_at: new Date().toISOString()
      };

      // 1. Update Supabase
      const { error } = await (await import('../lib/supabase')).supabase
        .from('profiles')
        .update({
          full_name: `${editData.firstName} ${editData.lastName}`, // Mobile uses full_name
          phone: editData.phone,
          avatar_url: editData.avatar,
          updated_at: new Date()
        })
        .eq('id', profile.id);

      if (error) throw error;

      // 2. Update Local Store
      updateProfile({
        firstName: editData.firstName,
        lastName: editData.lastName,
        phone: editData.phone,
        email: editData.email,
        avatar: editData.avatar
      });

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
      setIsEditOpen(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    try {
      // Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${profile.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await (await import('../lib/supabase')).supabase.storage
        .from('profile-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data } = (await import('../lib/supabase')).supabase.storage
        .from('profile-avatars')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update local edit state immediately to show preview
      setEditData(prev => ({ ...prev, avatar: publicUrl }));

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload Failed",
        description: "Could not upload image.",
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
          .from('addresses')
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
          .from('addresses')
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
          .from('addresses')
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
        .from('addresses')
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
    }
  };

  if (!profile) return null;

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
            <div className="relative group cursor-pointer" onClick={handleOpenEdit}>
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white p-1 shadow-2xl overflow-hidden ring-4 ring-white/10">
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="absolute bottom-1 right-1 bg-white text-[#ff6a00] p-1.5 rounded-full shadow-lg border-2 border-[#ff6a00]">
                <Edit2 className="w-3.5 h-3.5" />
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
                    <Mail className="w-3.5 h-3.5 text-orange-400" />
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    {profile.phone}
                  </span>
                </div>

                {/* Profile Stats - Styled like Seller Storefront */}
                <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">{profile.totalOrders}</span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-base font-bold">{profile.bazcoins}</span>
                      <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Bazcoins</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-bold">{followedShops.length}</span>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Following</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleOpenEdit}
                className="bg-[#ff6a00] hover:bg-[#e65e00] text-white font-bold h-10 px-6 rounded-xl shadow-lg shadow-orange-600/20 flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-10 pb-12 relative z-20">


        {/* Content Tabs */}
        <Tabs defaultValue="personal" className="-mt-4 space-y-4">
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

          {/* Personal Content Layout - cleaned up for viewing mode */}
          <TabsContent value="personal">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-[#ff6a00]" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email Address</div>
                      <div className="text-gray-900 font-medium">{profile.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone Number</div>
                      <div className="text-gray-900 font-medium">{profile.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Member Since</div>
                      <div className="text-gray-900 font-medium">{new Date(profile.memberSince).toLocaleDateString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShoppingBag className="h-5 w-5 text-[#ff6a00]" />
                    Shopping Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end pb-4 border-b border-gray-100">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Lifetime Spend</div>
                        <div className="text-2xl font-bold text-gray-900">₱{profile.totalSpent.toLocaleString()}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end pb-4 border-b border-gray-100">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Bazcoins Balance</div>
                        <div className="text-2xl font-bold text-yellow-600">{profile.bazcoins}</div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                        <Gift className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Buyer Rating</div>
                        <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
                          4.8 <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Star className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Addresses Content - Keeping mostly same structure but cleaner */}
          <TabsContent value="addresses">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <Card key={address.id} className="relative group border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{address.label}</h3>
                        {address.isDefault && <Badge>Default</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenAddressModal(address)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      {/* ADD THIS DELETE BUTTON */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteAddress(address.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-sm space-y-1 text-gray-600">
                      <p className="font-semibold text-black">{address.firstName} {address.lastName}</p>
                      <p>{address.phone}</p>
                      <p>{address.street}, {address.barangay}</p>
                      <p>{address.city}, {address.province} {address.postalCode}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add New Button */}
              <button
                onClick={() => handleOpenAddressModal()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-all min-h-[160px]"
              >
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                <span className="font-semibold text-gray-600">Add New Address</span>
              </button>
            </div>
          </TabsContent>

          <TabsContent value="following">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[1, 2, 3].map((shop) => (
                <Card key={shop} className="overflow-hidden hover:shadow-lg transition-shadow border-gray-100">
                  <div className="h-20 bg-gradient-to-r from-orange-100 to-orange-50" />
                  <CardContent className="p-6 pt-0 relative">
                    <div className="flex justify-between items-start -mt-10 mb-4">
                      <img
                        src={`https://images.unsplash.com/photo-156047235412${shop}?w=80&h=80&fit=crop`}
                        alt="Shop"
                        className="w-20 h-20 rounded-xl object-cover border-4 border-white shadow-md"
                      />
                      <Button variant="outline" size="sm" className="mt-12 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100">
                        Unfollow
                      </Button>
                    </div>

                    <h3 className="font-bold text-lg mb-1">TechHub Philippines</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                        <Star className="h-3 w-3 fill-current" /> 4.8
                      </span>
                      <span>2.5k followers</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </TabsContent>

          <TabsContent value="settings">
            {/* Keeping Settings same as before, just ensuring card style consistency */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-[#ff6a00]" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-gray-500">Receive order updates via email</div>
                    </div>
                    <Switch checked={profile.preferences.notifications.email} />
                  </div>
                  {/* ... (Other settings items kept simple for brevity or could copy-paste if needed) ... */}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

        </Tabs>
      </div>

      {/* Address Modal with Cascading Selects */}
      <Dialog open={isAddressOpen} onOpenChange={setIsAddressOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Address' : 'Add Shipping Address'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Label and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Address Label</Label>
                <Input placeholder="Home, Office, etc." value={newAddress.label} onChange={e => setNewAddress({ ...newAddress, label: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Street Name, House No.</Label>
              <Input value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} />
            </div>

            {/* Region and Province */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  value={regionList.find(r => r.region_name === newAddress.region)?.region_code}
                  onValueChange={onRegionChange}
                >
                  <SelectTrigger><SelectValue placeholder="Select Region" /></SelectTrigger>
                  <SelectContent>
                    {regionList.map(r => <SelectItem key={r.region_code} value={r.region_code}>{r.region_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Select
                  value={provinceList.find(p => p.province_name === newAddress.province)?.province_code}
                  onValueChange={onProvinceChange} disabled={!provinceList.length}
                >
                  <SelectTrigger><SelectValue placeholder="Select Province" /></SelectTrigger>
                  <SelectContent>
                    {provinceList.map(p => <SelectItem key={p.province_code} value={p.province_code}>{p.province_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* City and Barangay */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City / Municipality</Label>
                <Select
                  value={cityList.find(c => c.city_name === newAddress.city)?.city_code}
                  onValueChange={onCityChange} disabled={!cityList.length}
                >
                  <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
                  <SelectContent>
                    {cityList.map(c => <SelectItem key={c.city_code} value={c.city_code}>{c.city_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Select
                  disabled={!barangayList.length}
                  value={newAddress.barangay}
                  onValueChange={val => setNewAddress({ ...newAddress, barangay: val })}
                >
                  <SelectTrigger><SelectValue placeholder="Select Barangay" /></SelectTrigger>
                  <SelectContent>
                    {barangayList.map(b => <SelectItem key={b.brgy_code} value={b.brgy_name}>{b.brgy_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Postal Code & Default Switch */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input value={newAddress.postalCode} onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="default-addr"
                  checked={newAddress.isDefault}
                  onCheckedChange={checked => setNewAddress({ ...newAddress, isDefault: checked })}
                />
                <Label htmlFor="default-addr">Set as Default</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddressOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAddress} disabled={isSaving} className="bg-[#ff6a00] hover:bg-[#e65e00] text-white">
              {isSaving && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
              {editingId ? 'Update Address' : 'Save Address'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Avatar Area */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('dialog-avatar-upload')?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100">
                  <img
                    src={editData.avatar}
                    alt="Current Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <input
                  id="dialog-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <Label className="cursor-pointer text-sm text-blue-600 hover:underline" htmlFor="dialog-avatar-upload">Change Profile Photo</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-[#ff6a00] hover:bg-[#e65e00] text-white">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function deleteAddress(addressId: string) {
  throw new Error('Function not implemented.');
}