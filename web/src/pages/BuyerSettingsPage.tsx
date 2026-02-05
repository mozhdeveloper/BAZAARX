import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
  Check
} from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('addresses');
  const { toast } = useToast();
  const { profile, addresses, addAddress, updateAddress, deleteAddress } = useBuyerStore();

  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
        first_name: newAddress.firstName,
        last_name: newAddress.lastName,
        phone: newAddress.phone,
        street: newAddress.street,
        barangay: newAddress.barangay,
        city: newAddress.city,
        province: newAddress.province,
        region: newAddress.region,
        zip_code: newAddress.postalCode,
        is_default: newAddress.isDefault,
        landmark: newAddress.landmark || null,
        delivery_instructions: newAddress.deliveryInstructions || null,
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

  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showPurchases: false,
    showFollowing: true
  });

  const [security, setSecuritySettings] = useState({
    twoFactor: false,
    loginAlerts: true
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </motion.div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="addresses">
              <MapPin className="h-4 w-4 mr-2" />
              Addresses
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="wallet">
              <Wallet className="h-4 w-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

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
                        {address.isDefault && <Badge className="bg-orange-100 text-orange-700">Default</Badge>}
                      </div>
                      <p className="text-sm text-gray-900">{address.firstName} {address.lastName}</p>
                      <p className="text-sm text-gray-500">{address.phone}</p>
                      <p className="text-sm text-gray-500">{address.street}, {address.barangay}, {address.city}, {address.province}</p>
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
                              <Badge className="bg-orange-500">Default</Badge>
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
              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 mb-2">Available Balance</p>
                      <h2 className="text-4xl font-bold">₱1,234.50</h2>
                    </div>
                    <Wallet className="h-16 w-16 text-orange-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <Button className="bg-white text-orange-600 hover:bg-orange-50">
                      <Plus className="h-4 w-4 mr-2" />
                      Top Up
                    </Button>
                    <Button variant="outline" className="border-white text-white hover:bg-orange-600">
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
                    <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-orange-500">20% OFF</Badge>
                        <span className="text-xs text-gray-500">Valid until Feb 28</span>
                      </div>
                      <p className="text-sm font-medium">Purchase above ₱1000</p>
                      <code className="text-xs bg-white px-2 py-1 rounded mt-2 inline-block">SAVE20</code>
                    </div>
                    <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-orange-500">Free Shipping</Badge>
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
                    <Bell className="h-5 w-5 text-orange-600" />
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
                      onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
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
                      onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
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
                      onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
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
                      onCheckedChange={(checked) => setNotifications({ ...notifications, orderUpdates: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Promotions & Deals</p>
                      <p className="text-sm text-gray-500">Special offers and sales</p>
                    </div>
                    <Switch
                      checked={notifications.promotions}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, promotions: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Newsletter</p>
                      <p className="text-sm text-gray-500">Weekly product updates</p>
                    </div>
                    <Switch
                      checked={notifications.newsletter}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, newsletter: checked })}
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
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-orange-600" />
                    Password & Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter current password"
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
                    <Input type="password" placeholder="Enter new password" />
                  </div>

                  <div>
                    <Label>Confirm New Password</Label>
                    <Input type="password" placeholder="Confirm new password" />
                  </div>

                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    <Save className="h-4 w-4 mr-2" />
                    Update Password
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
                    <Shield className="h-5 w-5 text-orange-600" />
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
                      <Button variant="outline" className="w-full justify-start">
                        <Facebook className="h-5 w-5 mr-2 text-blue-600" />
                        Connect Facebook
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Twitter className="h-5 w-5 mr-2 text-sky-500" />
                        Connect Twitter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
      <BazaarFooter />

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
    </div>
  );
}
