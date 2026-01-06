import { useState } from "react";
import { 
  User,
  Bell,
  Lock,
  CreditCard,
  Save,
  Camera,
  Smartphone,
  Facebook,
  Instagram,
  Twitter,
  RefreshCw,
  LogOut,
  Store
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/sellerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sellerLinks } from "@/config/sellerLinks";

export function SellerSettings() {
  const { seller, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/seller/auth');
  };



  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    
    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = '✓ Settings saved successfully';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.name || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.name?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account and store preferences</p>
            </div>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="store">Store Info</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your personal details and profile picture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-3xl font-medium">
                          {seller?.name?.charAt(0) || 'S'}
                        </span>
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Camera className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Profile Picture</h4>
                      <p className="text-sm text-gray-500 mt-1">JPG, PNG or GIF. Max size 2MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" defaultValue="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" defaultValue="Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue="john@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" defaultValue="+63 912 345 6789" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Store Settings */}
            <TabsContent value="store">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Store Information
                  </CardTitle>
                  <CardDescription>Manage your store details and public information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input id="storeName" defaultValue="My Awesome Store" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeDesc">Store Description</Label>
                    <textarea
                      id="storeDesc"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      defaultValue="We sell quality products at affordable prices."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="storeAddress">Store Address</Label>
                      <Input id="storeAddress" defaultValue="123 Main St, Manila" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storeCity">City</Label>
                      <Input id="storeCity" defaultValue="Manila" />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Social Media Links</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Facebook className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <Input placeholder="Facebook page URL" defaultValue="https://facebook.com/mystore" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Instagram className="h-5 w-5 text-pink-600 flex-shrink-0" />
                        <Input placeholder="Instagram profile URL" defaultValue="https://instagram.com/mystore" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Twitter className="h-5 w-5 text-blue-400 flex-shrink-0" />
                        <Input placeholder="Twitter profile URL" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Manage how you receive notifications and updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Order Notifications', description: 'Get notified when you receive new orders' },
                    { label: 'Product Alerts', description: 'Alerts about product performance and issues' },
                    { label: 'Promotional Emails', description: 'Receive marketing and promotional content' },
                    { label: 'Weekly Report', description: 'Get weekly summaries of your store performance' },
                    { label: 'Review Notifications', description: 'Get notified of new product reviews' },
                    { label: 'Inventory Alerts', description: 'Low stock and out-of-stock notifications' }
                  ].map((setting, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <Label>{setting.label}</Label>
                        <p className="text-sm text-gray-500">{setting.description}</p>
                      </div>
                      <Switch defaultChecked={index !== 2} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>Manage your password and account security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" placeholder="Enter current password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" placeholder="Enter new password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="Confirm new password" />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Lock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">Password Requirements</h4>
                        <ul className="text-sm text-blue-800 mt-2 space-y-1">
                          <li>• At least 8 characters long</li>
                          <li>• Include uppercase and lowercase letters</li>
                          <li>• Include at least one number</li>
                          <li>• Include at least one special character</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-t">
                    <div>
                      <Label>Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings */}
            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Settings
                  </CardTitle>
                  <CardDescription>Manage your payment methods and payout preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Bank Account</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input id="bankName" defaultValue="BDO" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Name</Label>
                        <Input id="accountName" defaultValue="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input id="accountNumber" defaultValue="1234567890" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="branchCode">Branch Code</Label>
                        <Input id="branchCode" defaultValue="001" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">E-Wallet</h4>
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="gcash">GCash Number</Label>
                        <Input id="gcash" placeholder="09XX XXX XXXX" defaultValue="0912 345 6789" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Payout Schedule</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                        <input type="radio" name="payout" defaultChecked className="text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Weekly</p>
                          <p className="text-sm text-gray-500">Every Monday</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                        <input type="radio" name="payout" className="text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Bi-weekly</p>
                          <p className="text-sm text-gray-500">Every 1st and 15th</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                        <input type="radio" name="payout" className="text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Monthly</p>
                          <p className="text-sm text-gray-500">Every 1st of the month</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-gray-900 dark:text-white whitespace-pre"
      >
        BazaarPH Seller
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );
};
