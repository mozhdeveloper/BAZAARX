import { useState } from 'react';
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
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
              {mockAddresses.map((address) => (
                <Card key={address.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold text-lg">{address.label}</h3>
                          {address.isDefault && (
                            <Badge className="bg-orange-500">Default</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-gray-600">
                          <p className="font-medium text-gray-900">{address.fullName}</p>
                          <p>{address.phone}</p>
                          <p>{address.street}</p>
                          <p>{address.city}, {address.province} {address.zipCode}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {!address.isDefault && (
                          <Button variant="ghost" size="sm" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {!address.isDefault && (
                      <Button variant="outline" size="sm" className="mt-4">
                        Set as Default
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              <Button className="w-full bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Add New Address
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
    </div>
  );
}
