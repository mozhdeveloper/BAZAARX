import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Store,
} from "lucide-react";
import { motion } from "framer-motion";
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { useAuthStore } from "@/stores/sellerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SellerSettings() {
  const { seller } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();



  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);

    // Show success toast (bottom centered pill, white bg)
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-gray-900 px-6 py-3 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-[100] border border-orange-100 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300';
    toast.innerHTML = `
      <div class="flex items-center justify-center flex-shrink-0">
        <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
      <span class="text-sm whitespace-nowrap">Saved successfully</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-5');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  return (
    <SellerWorkspaceLayout>

      <div className="flex flex-1 w-full overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            {/* Header */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">Settings</h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1 -mb-2">Manage your account and store preferences</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <Tabs defaultValue="profile" className="w-full">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <TabsList className="inline-flex h-auto p-1 bg-white rounded-full shadow-sm border border-orange-100/50 overflow-x-auto scrollbar-hide max-w-full mb-0">
                    <TabsTrigger value="profile" className="rounded-full px-4 py-2 text-xs transition-all duration-300 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50 gap-2">
                      Profile
                    </TabsTrigger>
                    <TabsTrigger value="store" className="rounded-full px-4 py-2 text-xs transition-all duration-300 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50 gap-2">
                      Store Info
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-full px-4 py-2 text-xs transition-all duration-300 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50 gap-2">
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-full px-4 py-2 text-xs transition-all duration-300 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50 gap-2">
                      Security
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="rounded-full px-4 py-2 text-xs transition-all duration-300 data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50 gap-2">
                      Payment
                    </TabsTrigger>
                  </TabsList>

                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className={cn(
                      "rounded-full px-6 transition-all duration-300 flex items-center gap-2 h-10 shadow-lg",
                      hasChanges && !isSaving
                        ? "bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02]"
                        : "bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed shadow-none"
                    )}
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="font-bold">Save Changes</span>
                  </Button>
                </div>

                {/* Profile Settings */}
                <TabsContent value="profile">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Personal Information
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Update your personal details and profile picture</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pl-8 pt-4">
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
                          <Input id="firstName" defaultValue="John" onChange={() => setHasChanges(true)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" defaultValue="Doe" onChange={() => setHasChanges(true)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" defaultValue="john@example.com" onChange={() => setHasChanges(true)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" defaultValue="+63 912 345 6789" onChange={() => setHasChanges(true)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Store Settings */}
                <TabsContent value="store">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Store Information
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Manage your store details and public information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pl-8 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="storeName">Store Name</Label>
                        <Input id="storeName" defaultValue="My Awesome Store" onChange={() => setHasChanges(true)} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="storeDesc">Store Description</Label>
                        <textarea
                          id="storeDesc"
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          defaultValue="We sell quality products at affordable prices."
                          onChange={() => setHasChanges(true)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="storeAddress">Store Address</Label>
                          <Input id="storeAddress" defaultValue="123 Main St, Manila" onChange={() => setHasChanges(true)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="storeCity">City</Label>
                          <Input id="storeCity" defaultValue="Manila" onChange={() => setHasChanges(true)} />
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Social Media Links</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Facebook className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <Input placeholder="Facebook page URL" defaultValue="https://facebook.com/mystore" onChange={() => setHasChanges(true)} />
                          </div>
                          <div className="flex items-center gap-3">
                            <Instagram className="h-5 w-5 text-pink-600 flex-shrink-0" />
                            <Input placeholder="Instagram profile URL" defaultValue="https://instagram.com/mystore" onChange={() => setHasChanges(true)} />
                          </div>
                          <div className="flex items-center gap-3">
                            <Twitter className="h-5 w-5 text-blue-400 flex-shrink-0" />
                            <Input placeholder="Twitter profile URL" onChange={() => setHasChanges(true)} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Notification Preferences
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Manage how you receive notifications and updates</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 pl-8">
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
                          <Switch defaultChecked={index !== 2} onCheckedChange={() => setHasChanges(true)} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Security Settings
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Manage your password and account security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pl-8 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" type="password" placeholder="Enter current password" onChange={() => setHasChanges(true)} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" placeholder="Enter new password" onChange={() => setHasChanges(true)} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" type="password" placeholder="Confirm new password" onChange={() => setHasChanges(true)} />
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
                        <Switch onCheckedChange={() => setHasChanges(true)} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payment Settings */}
                <TabsContent value="payment">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Payment Settings
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Manage your payment methods and payout preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pl-8 pt-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Bank Account</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input id="bankName" defaultValue="BDO" onChange={() => setHasChanges(true)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountName">Account Name</Label>
                            <Input id="accountName" defaultValue="John Doe" onChange={() => setHasChanges(true)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input id="accountNumber" defaultValue="1234567890" onChange={() => setHasChanges(true)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="branchCode">Branch Code</Label>
                            <Input id="branchCode" defaultValue="001" onChange={() => setHasChanges(true)} />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">E-Wallet</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor="gcash">GCash Number</Label>
                            <Input id="gcash" placeholder="09XX XXX XXXX" defaultValue="0912 345 6789" onChange={() => setHasChanges(true)} />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Payout Schedule</h4>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                            <input type="radio" name="payout" defaultChecked className="text-orange-500" onChange={() => setHasChanges(true)} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Weekly</p>
                              <p className="text-sm text-gray-500">Every Monday</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                            <input type="radio" name="payout" className="text-orange-500" onChange={() => setHasChanges(true)} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Bi-weekly</p>
                              <p className="text-sm text-gray-500">Every 1st and 15th</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-orange-500 has-[:checked]:bg-orange-50">
                            <input type="radio" name="payout" className="text-orange-500" onChange={() => setHasChanges(true)} />
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
      </div>
    </SellerWorkspaceLayout>
  );
}

