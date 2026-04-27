import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  MapPin,
  CreditCard,
  Wallet,
  Bell,
  Shield,
  Smartphone,
  Mail,
  Lock,
  Trash2,
  Plus,
  Edit3,
  Facebook,
  Twitter,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Map,
  LocateFixed,
  Check,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useBuyerStore, Address } from '../stores/buyerStore';
import { useToast } from '@/hooks/use-toast';
import { regions, provinces, cities, barangays } from "select-philippines-address";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressPicker } from '@/components/ui/address-picker';
import { authService } from '../services/authService';
import { validatePassword } from '../utils/validation';

// Mock data
const mockAddresses = [
  {
    id: '1',
    label: 'Home',
    fullName: 'John Doe',
    phone: '+63 912 345 6789',
    street: '123 Main Street, Barangay San Antonio',
    city: 'Makati',
    province: 'Metro Manila',
    zipCode: '1200',
    isDefault: true
  },
  {
    id: '2',
    label: 'Office',
    fullName: 'John Doe',
    phone: '+63 912 345 6789',
    street: '456 Business Ave, BGC',
    city: 'Taguig',
    province: 'Metro Manila',
    zipCode: '1634',
    isDefault: false
  }
];

const mockPaymentMethods = [
  {
    id: '1',
    type: 'card',
    name: 'Visa ending in 4242',
    cardNumber: '**** **** **** 4242',
    expiry: '12/25',
    isDefault: true,
    icon: '💳'
  },
  {
    id: '2',
    type: 'gcash',
    name: 'GCash',
    phone: '+63 912 345 6789',
    isDefault: false,
    icon: '💰'
  }
];

export default function BuyerSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'addresses';

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const { toast } = useToast();
  const { profile, addresses, addAddress, updateAddress, deleteAddress, logout } = useBuyerStore();

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({ title: 'Type DELETE to confirm', variant: 'destructive' });
      return;
    }
    if (!deletePassword) {
      toast({ title: 'Password required', variant: 'destructive' });
      return;
    }
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { password: deletePassword, confirm: true },
      });
      if (error || data?.error) {
        const msg = data?.message || data?.error || error?.message || 'Failed to delete account';
        toast({ title: 'Error', description: msg, variant: 'destructive' });
        return;
      }
      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
      logout();
      await supabase.auth.signOut();
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const livePasswordValidation =
    newPassword.length > 0 ? validatePassword(newPassword) : null;
  const livePasswordError =
    livePasswordValidation && !livePasswordValidation.valid
      ? livePasswordValidation.errors[0]
      : '';
  const hasPasswordMismatch =
    confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = useState(false);
  const [showUnlinkModal, setShowUnlinkModal] = useState(false);
  const [identities, setIdentities] = useState<any[]>([]);

  // Address Selection Lists
  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  const [newAddress, setNewAddress] = useState({
    label: '',
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    postalCode: '',
    isDefault: false,
    coordinates: null as { lat: number; lng: number } | null,
    landmark: '',
    deliveryInstructions: '',
  });

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Load regions on mount
  useEffect(() => {
    regions().then(res => setRegionList(res));
  }, []);

  // Cascading Logic: Update next level when previous level changes
  const onRegionChange = (code: string) => {
    const name = regionList.find(i => i.region_code === code)?.region_name;
    setNewAddress({ ...newAddress, region: name, province: '', city: '', barangay: '' });
    provinces(code).then(res => setProvinceList(res));
  };

  const onProvinceChange = (code: string) => {
    const name = provinceList.find(i => i.province_code === code)?.province_name;
    setNewAddress({ ...newAddress, province: name, city: '', barangay: '' });
    cities(code).then(res => setCityList(res));
  };

  const onCityChange = (code: string) => {
    const name = cityList.find(i => i.city_code === code)?.city_name;
    setNewAddress({ ...newAddress, city: name, barangay: '' });
    barangays(code).then(res => setBarangayList(res));
  };

  const handleOpenAddressModal = async (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      setNewAddress({
        ...address,
        coordinates: address.coordinates || null,
        landmark: address.landmark || '',
        deliveryInstructions: address.deliveryInstructions || '',
      });

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
        label: 'Home',
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        phone: profile?.phone || '',
        street: '',
        barangay: '',
        city: '',
        province: '',
        region: '',
        postalCode: '',
        isDefault: addresses.length === 0,
        coordinates: null,
        landmark: '',
        deliveryInstructions: '',
      });
    }
    setIsAddressOpen(true);
  };

  const handleSaveAddress = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const { addressService } = await import('../services/addressService');

      // FIX: Clear existing default in DB and Local State
      if (newAddress.isDefault) {
        await addressService.setDefaultAddress(profile.id, ''); // Clear all defaults first

        // Update local store to reset other defaults
        addresses.forEach(addr => {
          if (addr.isDefault) updateAddress(addr.id, { ...addr, isDefault: false });
        });
      }

      const addressPayload: any = {
        user_id: profile.id,
        label: newAddress.label,
        address_line_1: `${newAddress.firstName} ${newAddress.lastName}, ${newAddress.phone}, ${newAddress.street}`,
        address_line_2: newAddress.landmark || null,
        barangay: newAddress.barangay,
        city: newAddress.city,
        province: newAddress.province,
        region: newAddress.region,
        postal_code: newAddress.postalCode,
        is_default: newAddress.isDefault,
        delivery_instructions: newAddress.deliveryInstructions || null,
        address_type: 'residential',
      };

      // Include coordinates if available
      if (newAddress.coordinates) {
        addressPayload.coordinates = newAddress.coordinates;
      }

      if (editingId) {
        const updatedAddress = await addressService.updateAddress(editingId, addressPayload);
        updateAddress(editingId, updatedAddress);
      } else {
        const savedAddress = await addressService.createAddress(addressPayload);
        addAddress(savedAddress);
      }
      setIsAddressOpen(false);
      setShowMapPicker(false);
      toast({ title: editingId ? "Address updated" : "Address added" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  // Form states
  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    push: true,
    orderUpdates: true,
    promotions: false,
    newsletter: true
  });

  const handleSendPasswordReset = async () => {
    setIsSendingReset(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email;
      if (!email) {
        toast({
          title: 'Unable to send reset link',
          description: 'No email found for your current session.',
          variant: 'destructive',
        });
        return;
      }

      await authService.resetPassword(email);
      toast({
        title: 'Reset link sent',
        description: 'Check your email to reset your password.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset link';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in current, new, and confirm password fields.',
        variant: 'destructive',
      });
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      toast({
        title: 'Weak password',
        description: passwordValidation.errors[0] || 'Password does not meet minimum security requirements.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error('No authenticated user found.');
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        toast({
          title: 'Incorrect current password',
          description: 'Please check your current password and try again.',
          variant: 'destructive',
        });
        return;
      }

      await authService.updatePassword(newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Load notification consent from DB on mount
  useEffect(() => {
    const loadConsent = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const consentTable = (supabase as any).from('user_consent');
      const { data: rows } = await consentTable
        .select('channel, consent_type, is_consented')
        .eq('user_id', user.id);

      const consentRows = (rows ?? []) as Array<{
        channel: string;
        consent_type: string;
        is_consented: boolean;
      }>;
      if (!consentRows.length) return;

      const get = (channel: string, type: string) =>
        consentRows.find((r) => r.channel === channel && r.consent_type === type)?.is_consented ?? true;

      setNotifications({
        email: get('email', 'transactional'),
        sms: get('sms', 'transactional'),
        push: get('push', 'transactional'),
        orderUpdates: get('email', 'transactional'),
        promotions: get('email', 'marketing'),
        newsletter: get('email', 'newsletter'),
      });
    };

    loadConsent().catch(console.error);
  }, []);

  const saveConsent = (channel: string, consentType: string, isConsented: boolean) => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const consentTable = (supabase as any).from('user_consent');
      await consentTable.upsert(
        {
          user_id: user.id,
          channel,
          consent_type: consentType,
          is_consented: isConsented,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,channel,consent_type' }
      );
    })().catch(console.error);
  };

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showPurchases: false,
    showFollowing: true
  });

  const [security, setSecuritySettings] = useState({
    twoFactor: false,
    loginAlerts: true
  });

  // Fetch identities on mount
  useEffect(() => {
    const fetchIdentities = async () => {
      const { data } = await (supabase.auth as any).getUserIdentities();
      if (data?.identities) {
        setIdentities(data.identities);
      }
    };
    fetchIdentities();
  }, []);

  const handleUnlinkGoogle = async () => {
    setIsUnlinkingGoogle(true);
    try {
      const { data: identityData } = await (supabase.auth as any).getUserIdentities();
      const googleIdentity = identityData?.identities?.find((id: any) => id.provider === 'google');

      if (googleIdentity) {
        const { error } = await (supabase.auth as any).unlinkIdentity(googleIdentity);
        if (error) throw error;

        // Also clear metadata for explicit linking policy
        await supabase.auth.updateUser({
          data: { google_explicitly_linked: false }
        });

        // Refresh identities in local state
        const { data: freshData } = await (supabase.auth as any).getUserIdentities();
        if (freshData?.identities) setIdentities(freshData.identities);

        toast({ title: 'Google Unlinked', description: 'Your Google account has been disconnected successfully.' });
      }
    } catch (err: any) {
      toast({ title: 'Unlinking Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUnlinkingGoogle(false);
      setShowUnlinkModal(false);
    }
  };

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      sessionStorage.setItem('oauth_intent', 'link_google');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/settings?tab=security', // Will be caught by App.tsx
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
      if (data.url) window.location.assign(data.url);
    } catch (err: any) {
      toast({ title: 'Connection Failed', description: err.message, variant: 'destructive' });
      setIsLinkingGoogle(false);
    }
  };

  const isGoogleConnected = identities.some(id => id.provider === 'google');

  return (
    <div className="min-h-screen bg-[var(--brand-wash)]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-4 group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Back to Shop</span>
          </button>
          <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Settings</h1>
          <p className="text-[var(--text-muted)]">Manage your account settings and preferences</p>
        </motion.div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto scrollbar-hide pb-0.5">
            <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-full md:min-w-max">
              {[
                { value: 'addresses', label: 'Addresses', icon: MapPin },
                { value: 'payment', label: 'Payment', icon: CreditCard },
                { value: 'wallet', label: 'Wallet', icon: Wallet },
                { value: 'notifications', label: 'Notifications', icon: Bell },
                { value: 'security', label: 'Security', icon: Shield },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-300",
                    activeTab === tab.value
                      ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                      : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Addresses Tab */}
          <TabsContent value="addresses">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {addresses.map((address) => (
                <div key={address.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{address.label}</span>
                        {address.isDefault && <Badge className="bg-[var(--brand-wash)] text-[var(--brand-primary)]">Default</Badge>}
                      </div>
                      <p className="text-sm text-[var(--text-headline)]">{address.firstName} {address.lastName}</p>
                      <p className="text-sm text-[var(--text-muted)]">{address.phone}</p>
                      <p className="text-sm text-[var(--text-muted)]">{address.street}, {address.barangay}, {address.city}, {address.province}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenAddressModal(address)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={async () => {
                      if (confirm("Delete?")) {
                        try {
                          const { addressService } = await import('../services/addressService');
                          await addressService.deleteAddress(address.id);
                          deleteAddress(address.id);
                          toast({ title: "Address deleted" });
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        }
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={() => handleOpenAddressModal()}>
                <Plus className="h-4 w-4 mr-2" /> Add New Address
              </Button>
            </motion.div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {mockPaymentMethods.map((method) => (
                <Card key={method.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{method.icon}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{method.name}</h3>
                            {method.isDefault && (
                              <Badge className="bg-[var(--brand-primary)]">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {method.type === 'card' ? method.cardNumber : method.phone}
                          </p>
                          {method.type === 'card' && (
                            <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {!method.isDefault && (
                          <Button variant="ghost" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {!method.isDefault && (
                      <Button variant="outline" size="sm" className="mt-4">
                        Set as Default
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-24 border-dashed">
                  <div className="text-center">
                    <CreditCard className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm">Add Card</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-24 border-dashed">
                  <div className="text-center">
                    <Smartphone className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm">Add GCash/Maya</span>
                  </div>
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Wallet Balance */}
              <Card className="bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 mb-2">Available Balance</p>
                      <h2 className="text-4xl font-bold">₱1,234.50</h2>
                    </div>
                    <Wallet className="h-16 w-16 text-white/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <Button className="bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]">
                      <Plus className="h-4 w-4 mr-2" />
                      Top Up
                    </Button>
                    <Button variant="outline" className="border-white text-white hover:bg-[var(--brand-primary-dark)]">
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Your wallet transaction history</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { type: 'credit', amount: 500, desc: 'Cashback from order #123', date: 'Today' },
                      { type: 'debit', amount: -1200, desc: 'Payment for order #122', date: 'Yesterday' },
                      { type: 'credit', amount: 2000, desc: 'Wallet top-up', date: '2 days ago' }
                    ].map((tx, i) => (
                      <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{tx.desc}</p>
                          <p className="text-sm text-gray-500">{tx.date}</p>
                        </div>
                        <span className={cn(
                          "font-semibold text-lg",
                          tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {tx.type === 'credit' ? '+' : ''}₱{Math.abs(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Vouchers */}
              <Card>
                <CardHeader>
                  <CardTitle>My Vouchers</CardTitle>
                  <CardDescription>Available discount vouchers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-2 border-dashed border-[var(--brand-wash-gold)]/40 rounded-lg p-4 bg-[var(--brand-wash)]">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-[var(--brand-primary)]">20% OFF</Badge>
                        <span className="text-xs text-gray-500">Valid until Feb 28</span>
                      </div>
                      <p className="text-sm font-medium">Purchase above ₱1000</p>
                      <code className="text-xs bg-white px-2 py-1 rounded mt-2 inline-block">SAVE20</code>
                    </div>
                    <div className="border-2 border-dashed border-[var(--brand-wash-gold)]/40 rounded-lg p-4 bg-[var(--brand-wash)]">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-[var(--brand-primary)]">Free Shipping</Badge>
                        <span className="text-xs text-gray-500">Valid until Jan 31</span>
                      </div>
                      <p className="text-sm font-medium">No minimum purchase</p>
                      <code className="text-xs bg-white px-2 py-1 rounded mt-2 inline-block">FREESHIP</code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-[var(--brand-primary)]" />
                    Notification Channels
                  </CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">Receive updates via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => { setNotifications({ ...notifications, email: checked }); saveConsent('email', 'transactional', checked); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Get text message alerts</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) => { setNotifications({ ...notifications, sms: checked }); saveConsent('sms', 'transactional', checked); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Push Notifications</p>
                        <p className="text-sm text-gray-500">Browser notifications</p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => { setNotifications({ ...notifications, push: checked }); saveConsent('push', 'transactional', checked); }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <CardDescription>Choose what notifications you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order Updates</p>
                      <p className="text-sm text-gray-500">Order status changes</p>
                    </div>
                    <Switch
                      checked={notifications.orderUpdates}
                      onCheckedChange={(checked) => { setNotifications({ ...notifications, orderUpdates: checked }); saveConsent('email', 'transactional', checked); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Promotions & Deals</p>
                      <p className="text-sm text-gray-500">Special offers and sales</p>
                    </div>
                    <Switch
                      checked={notifications.promotions}
                      onCheckedChange={(checked) => { setNotifications({ ...notifications, promotions: checked }); saveConsent('email', 'marketing', checked); }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Newsletter</p>
                      <p className="text-sm text-gray-500">Weekly product updates</p>
                    </div>
                    <Switch
                      checked={notifications.newsletter}
                      onCheckedChange={(checked) => { setNotifications({ ...notifications, newsletter: checked }); saveConsent('email', 'newsletter', checked); }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-[var(--brand-primary)]" />
                      Password & Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Need to reset your password?</p>
                        <p className="text-sm text-gray-500">We’ll send a secure reset link to your account email.</p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleSendPasswordReset}
                        disabled={isSendingReset}
                        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] rounded-full"
                      >
                        {isSendingReset ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Sending</span>
                        ) : (
                          'Send Reset Link'
                        )}
                      </Button>
                    </div>

                    <div>
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {livePasswordError ? <p className="text-sm text-red-600 mt-1">{livePasswordError}</p> : null}
                    </div>

                    <div>
                      <Label>Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {hasPasswordMismatch ? <p className="text-sm text-red-600 mt-1">Passwords do not match.</p> : null}
                    </div>

                    <Button
                      type="button"
                      onClick={handleUpdatePassword}
                      disabled={isUpdatingPassword || hasPasswordMismatch || !!livePasswordError}
                      className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                    >
                      {isUpdatingPassword ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" />Update Password</>
                      )}
                    </Button>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Add extra security to your account</p>
                        </div>
                        <Switch
                          checked={security.twoFactor}
                          onCheckedChange={(checked) => setSecuritySettings({ ...security, twoFactor: checked })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-[var(--brand-primary)]" />
                      Privacy & Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Profile</p>
                        <p className="text-sm text-gray-500">Make your profile visible</p>
                      </div>
                      <Switch
                        checked={privacy.showProfile}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showProfile: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Purchase History</p>
                        <p className="text-sm text-gray-500">Display your purchases</p>
                      </div>
                      <Switch
                        checked={privacy.showPurchases}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showPurchases: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Following List</p>
                        <p className="text-sm text-gray-500">Display followed shops</p>
                      </div>
                      <Switch
                        checked={privacy.showFollowing}
                        onCheckedChange={(checked) => setPrivacy({ ...privacy, showFollowing: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <p className="font-medium">Login Alerts</p>
                        <p className="text-sm text-gray-500">Get notified of new logins</p>
                      </div>
                      <Switch
                        checked={security.loginAlerts}
                        onCheckedChange={(checked) => setSecuritySettings({ ...security, loginAlerts: checked })}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Connected Accounts</h4>
                      <div className="space-y-2">
                        {isGoogleConnected ? (
                          <Button
                            variant="outline"
                            className="w-full justify-between p-3 border rounded-xl bg-green-50/50 border-green-100 hover:bg-red-50 hover:border-red-100 group transition-all"
                            onClick={() => setShowUnlinkModal(true)}
                          >
                            <div className="flex items-center gap-2">
                              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
                              <span className="text-sm font-medium text-green-700 group-hover:text-red-700 transition-colors">Google Connected</span>
                            </div>
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-600 group-hover:hidden" />
                              <Trash2 className="h-4 w-4 text-red-600 hidden group-hover:block" />
                            </div>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full justify-start hover:bg-orange-50 hover:border-orange-200 transition-all"
                            onClick={handleLinkGoogle}
                            disabled={isLinkingGoogle}
                          >
                            {isLinkingGoogle ? (
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            ) : (
                              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 mr-2" alt="Google" />
                            )}
                            Connect Google Account
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Danger Zone */}
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription className="text-red-600/70">
                    Permanent actions that cannot be undone. Under the Data Privacy Act (RA 10173),
                    you have the right to erasure of your personal data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-white">
                    <div>
                      <p className="font-medium text-gray-900">Delete Account</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Permanently delete your account and all associated data.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                      className="ml-4 shrink-0"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
      <BazaarFooter />

      {/* Account Deletion Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => {
        if (!isDeleting) {
          setShowDeleteModal(open);
          if (!open) { setDeletePassword(''); setDeleteConfirmText(''); }
        }
      }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              This action is <strong>permanent and irreversible</strong>. All your data —
              orders, addresses, reviews, and profile information — will be deleted in
              compliance with the Data Privacy Act (RA 10173).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Confirm your password</Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Your current password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <strong>DELETE</strong> to confirm
              </Label>
              <Input
                id="delete-confirm"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={isDeleting}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmText !== 'DELETE' || !deletePassword}
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Permanently Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddressOpen} onOpenChange={(open) => { setIsAddressOpen(open); if (!open) setShowMapPicker(false); }}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>

          {/* Map Picker View */}
          {showMapPicker ? (
            <div className="flex-1 overflow-hidden" style={{ height: '450px' }}>
              <AddressPicker
                initialCoordinates={newAddress.coordinates || undefined}
                onLocationSelect={(location) => {
                  setNewAddress({
                    ...newAddress,
                    street: location.street || newAddress.street,
                    barangay: location.barangay || newAddress.barangay,
                    city: location.city || newAddress.city,
                    province: location.province || newAddress.province,
                    region: location.region || newAddress.region,
                    postalCode: location.postalCode || newAddress.postalCode,
                    coordinates: location.coordinates,
                  });
                  setShowMapPicker(false);
                }}
                onClose={() => setShowMapPicker(false)}
              />
            </div>
          ) : (
            <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
              {/* Map Picker Button */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-500 rounded-full p-2">
                      <Map className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Pick from Map</p>
                      <p className="text-xs text-gray-500">Use GPS or search location</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMapPicker(true)}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <LocateFixed className="w-4 h-4 mr-1" />
                    Open Map
                  </Button>
                </div>
                {newAddress.coordinates && (
                  <div className="mt-2 pt-2 border-t border-orange-200">
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Location: {newAddress.coordinates.lat.toFixed(4)}, {newAddress.coordinates.lng.toFixed(4)}
                    </p>
                  </div>
                )}
              </div>

              {/* 1. Address Label & Phone Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Address Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g. Home, Office"
                    value={newAddress.label}
                    onChange={e => setNewAddress({ ...newAddress, label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="0912 345 6789"
                    value={newAddress.phone}
                    onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Street and House No. */}
              <div className="space-y-2">
                <Label>Street / House No.</Label>
                <Input value={newAddress.street} onChange={e => setNewAddress({ ...newAddress, street: e.target.value })} />
              </div>

              {/* Region and Province */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Select
                    // Maps the saved Name back to the Code for the dropdown value
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
                    // Maps saved Province Name back to Code
                    value={provinceList.find(p => p.province_name === newAddress.province)?.province_code}
                    onValueChange={onProvinceChange}
                    disabled={!provinceList.length}
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
                  <Label>City</Label>
                  <Select
                    // Maps saved City Name back to Code
                    value={cityList.find(c => c.city_name === newAddress.city)?.city_code}
                    onValueChange={onCityChange}
                    disabled={!cityList.length}
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
                    // Barangay usually works by name directly in this library
                    value={newAddress.barangay}
                    onValueChange={v => setNewAddress({ ...newAddress, barangay: v })}
                    disabled={!barangayList.length}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Barangay" /></SelectTrigger>
                    <SelectContent>
                      {barangayList.map(b => <SelectItem key={b.brgy_code} value={b.brgy_name}>{b.brgy_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 2. Postal Code & Set to Default Toggle */}
              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    placeholder="1234"
                    value={newAddress.postalCode}
                    onChange={e => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="set-default"
                    checked={newAddress.isDefault}
                    onCheckedChange={(checked) => setNewAddress({ ...newAddress, isDefault: checked })}
                  />
                  <Label htmlFor="set-default" className="cursor-pointer">Set as Default</Label>
                </div>
              </div>

              {/* Landmark (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input
                  id="landmark"
                  placeholder="Near SM Mall, In front of church, etc."
                  value={newAddress.landmark}
                  onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })}
                />
              </div>

              {/* Delivery Instructions (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">Delivery Instructions (Optional)</Label>
                <Input
                  id="deliveryInstructions"
                  placeholder="Gate code, leave at door, call upon arrival, etc."
                  value={newAddress.deliveryInstructions}
                  onChange={e => setNewAddress({ ...newAddress, deliveryInstructions: e.target.value })}
                />
              </div>
            </div>
          )}

          {!showMapPicker && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddressOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAddress} disabled={isSaving} className="bg-[#ff6a00] hover:bg-[#e65e00] text-white">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Update Address' : 'Save Address'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUnlinkModal} onOpenChange={setShowUnlinkModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Disconnect Google Account?
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to unlink your Google account? You will no longer be able to sign in using Google unless you reconnect it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowUnlinkModal(false)}
              disabled={isUnlinkingGoogle}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlinkGoogle}
              disabled={isUnlinkingGoogle}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUnlinkingGoogle ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Disconnect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
