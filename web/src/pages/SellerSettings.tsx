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
import { Textarea } from "@/components/ui/textarea";
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
                        ? "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-accent)]"
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
                      {/* Profile Header with Picture and Fields */}
                      <div className="flex flex-col lg:flex-row gap-12">
                        {/* Profile Picture Column */}
                        <div className="flex flex-col items-center lg:items-start gap-4 flex-shrink-0">
                          <div className="relative">
                            <div className="w-32 h-32 rounded-full overflow-hidden shadow-xl shadow-orange-500/20 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                              {seller?.avatar ? (
                                <img
                                  src={seller.avatar}
                                  alt={seller?.name || "Seller"}
                                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                />
                              ) : (
                                <span className="text-white text-4xl font-black">
                                  {seller?.name?.charAt(0) || 'S'}
                                </span>
                              )}
                            </div>
                            <button className="absolute bottom-1 right-1 w-10 h-10 bg-white rounded-full border-2 border-gray-100 shadow-md flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 group">
                              <Camera className="h-5 w-5 text-gray-600 group-hover:text-[var(--brand-primary)]" />
                            </button>
                          </div>
                          <div className="text-center lg:text-left">
                            <h4 className="text-sm font-bold text-[var(--text-headline)]">Profile Picture</h4>
                            <p className="text-[12px] text-[var(--text-muted)] mt-1 whitespace-nowrap">JPG, PNG or GIF. Max size 2MB</p>
                          </div>
                        </div>

                        {/* Form Fields Column */}
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                              <Label htmlFor="firstName" className="font-bold text-[var(--text-secondary)]">First Name</Label>
                              <Input id="firstName" defaultValue="John" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName" className="font-bold text-[var(--text-secondary)]">Last Name</Label>
                              <Input id="lastName" defaultValue="Doe" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="font-bold text-[var(--text-secondary)]">Email</Label>
                              <Input id="email" type="email" defaultValue="john@example.com" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="phone" className="font-bold text-[var(--text-secondary)]">Phone Number</Label>
                              <Input id="phone" defaultValue="+63 912 345 6789" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Store Settings */}
                <TabsContent value="store">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8 pb-2">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Store Information
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Manage your store details and public information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pl-8 pt-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Side: Name and Location */}
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="storeName" className="font-bold text-[var(--text-secondary)]">Store Name</Label>
                            <Input id="storeName" defaultValue="My Awesome Store" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="storeAddress" className="font-bold text-[var(--text-secondary)]">Store Address</Label>
                              <Input id="storeAddress" defaultValue="123 Main St, Manila" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="storeCity" className="font-bold text-[var(--text-secondary)]">City</Label>
                              <Input id="storeCity" defaultValue="Manila" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Description */}
                        <div className="flex flex-col space-y-2 h-full">
                          <Label htmlFor="storeDesc" className="font-bold text-[var(--text-secondary)]">Store Description</Label>
                          <Textarea
                            id="storeDesc"
                            className="flex-1 min-h-[148px] lg:min-h-0 w-full rounded-xl border-gray-200"
                            placeholder="Tell customers about your store..."
                            defaultValue="We sell quality products at affordable prices."
                            onChange={() => setHasChanges(true)}
                          />
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
                    <CardHeader className="bg-white p-8 pb-2">
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
                    <CardHeader className="bg-white p-8 pb-2">
                      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
                        Security Settings
                      </CardTitle>
                      <CardDescription className="text-[var(--text-muted)]">Manage your password and account security</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8 pl-8 pt-4">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Left Side: Requirements */}
                        <div className="lg:col-span-4">
                          <div className="flex gap-3">
                            <div className="h-8 w-8 rounded-full bg-[var(--text-muted)]/50 flex items-center justify-center flex-shrink-0">
                              <Lock className="h-4 w-4 text-blue-700" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-blue-600">Password Requirements</h4>
                              <ul className="text-[12px] text-blue-500 mt-2 space-y-2">
                                <li className="flex items-center gap-2">
                                  <span className="h-1 w-1 rounded-full bg-blue-600" />
                                  At least 8 characters
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="h-1 w-1 rounded-full bg-blue-600" />
                                  Uppercase & lowercase
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="h-1 w-1 rounded-full bg-blue-600" />
                                  At least one number
                                </li>
                                <li className="flex items-center gap-2">
                                  <span className="h-1 w-1 rounded-full bg-blue-600" />
                                  One special character
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Password Inputs */}
                        <div className="lg:col-span-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Current Password - Left Column */}
                            <div className="space-y-2">
                              <Label htmlFor="currentPassword" title="Current Password" className="font-bold text-[var(--text-secondary)] whitespace-nowrap">Current Password</Label>
                              <Input id="currentPassword" type="password" placeholder="Current" title="Enter current password" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                            </div>

                            {/* New & Confirm - Right Column */}
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <Label htmlFor="newPassword" title="New Password" className="font-bold text-[var(--text-secondary)] whitespace-nowrap">New Password</Label>
                                <Input id="newPassword" type="password" placeholder="New" title="Enter new password" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="confirmPassword" title="Confirm New Password" className="font-bold text-[var(--text-secondary)] whitespace-nowrap">Confirm New</Label>
                                <Input id="confirmPassword" type="password" placeholder="Confirm" title="Confirm new password" className="h-11 rounded-xl" onChange={() => setHasChanges(true)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-6 border-t border-gray-100">
                        <div>
                          <Label className="font-bold text-[var(--text-headline)]">Two-Factor Authentication</Label>
                          <p className="text-sm text-[var(--text-muted)]">Add an extra layer of security to your account</p>
                        </div>
                        <Switch onCheckedChange={() => setHasChanges(true)} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payment Settings */}
                <TabsContent value="payment">
                  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
                    <CardHeader className="bg-white p-8 pb-2">
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

