import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Shield,
  Globe,
  Palette,
  Mail,
  Save,
  RefreshCw
} from 'lucide-react';

const AdminSettings: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('Settings saved successfully!');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-1">Manage platform configuration and preferences</p>
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
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>Manage platform-wide configurations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="platform-name">Platform Name</Label>
                      <Input id="platform-name" defaultValue="BazaarPH" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input id="support-email" type="email" defaultValue="support@bazaarph.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Contact Phone</Label>
                      <Input id="contact-phone" defaultValue="+63 2 8123 4567" />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-gray-500">Temporarily disable the platform</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Allow New Registrations</Label>
                        <p className="text-sm text-gray-500">Enable new user sign-ups</p>
                      </div>
                      <Switch defaultChecked />
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
                    <CardDescription>Configure notification settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'New Order Notifications', description: 'Receive alerts for new orders' },
                      { label: 'Seller Registration', description: 'Notify when sellers register' },
                      { label: 'Payment Alerts', description: 'Get notified of payment activities' },
                      { label: 'Dispute Notifications', description: 'Alerts for customer disputes' },
                      { label: 'System Alerts', description: 'Technical and system notifications' }
                    ].map((setting, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <Label>{setting.label}</Label>
                          <p className="text-sm text-gray-500">{setting.description}</p>
                        </div>
                        <Switch defaultChecked />
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
                      <Shield className="w-5 h-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Manage security and access controls</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Session Timeout</Label>
                        <p className="text-sm text-gray-500">Auto logout after inactivity</p>
                      </div>
                      <select className="px-3 py-2 border border-gray-300 rounded-lg">
                        <option>15 minutes</option>
                        <option>30 minutes</option>
                        <option>1 hour</option>
                        <option>Never</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Settings */}
              <TabsContent value="appearance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Appearance Settings
                    </CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <div className="grid grid-cols-3 gap-4">
                        <button className="p-4 border-2 border-orange-500 rounded-lg bg-white">
                          <div className="w-full h-20 bg-gradient-to-br from-white to-gray-100 rounded mb-2"></div>
                          <span className="text-sm font-medium">Light</span>
                        </button>
                        <button className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-orange-500">
                          <div className="w-full h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded mb-2"></div>
                          <span className="text-sm font-medium">Dark</span>
                        </button>
                        <button className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-orange-500">
                          <div className="w-full h-20 bg-gradient-to-br from-white via-gray-100 to-gray-800 rounded mb-2"></div>
                          <span className="text-sm font-medium">Auto</span>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex gap-3">
                        {['#FF6A00', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'].map((color) => (
                          <button
                            key={color}
                            className="w-12 h-12 rounded-lg border-2 border-gray-300 hover:border-gray-400"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Compact Mode</Label>
                        <p className="text-sm text-gray-500">Reduce spacing for more content</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Email Settings */}
              <TabsContent value="email">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Email Configuration
                    </CardTitle>
                    <CardDescription>Configure email service settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="smtp-host">SMTP Host</Label>
                      <Input id="smtp-host" placeholder="smtp.example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">SMTP Port</Label>
                      <Input id="smtp-port" placeholder="587" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">SMTP Username</Label>
                      <Input id="smtp-user" placeholder="noreply@bazaarph.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-password">SMTP Password</Label>
                      <Input id="smtp-password" type="password" />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Enable SSL/TLS</Label>
                        <p className="text-sm text-gray-500">Secure email transmission</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Button variant="outline" className="w-full">
                      Send Test Email
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
