import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Bell,
  Shield,
  Globe,
  Palette,
  Mail,
  Save,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

const SETTINGS_KEY = 'bazaar_admin_settings';

interface AdminSettingsData {
  platformName: string;
  supportEmail: string;
  contactPhone: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  notifyOrders: boolean;
  notifySellerReg: boolean;
  notifyPayments: boolean;
  notifyDisputes: boolean;
  notifySystem: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
  theme: string;
  primaryColor: string;
  compactMode: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  enableSsl: boolean;
}

const defaultSettings: AdminSettingsData = {
  platformName: 'BazaarPH',
  supportEmail: 'support@bazaarph.com',
  contactPhone: '+63 2 8123 4567',
  maintenanceMode: false,
  allowRegistrations: true,
  notifyOrders: true,
  notifySellerReg: true,
  notifyPayments: true,
  notifyDisputes: true,
  notifySystem: true,
  twoFactorAuth: false,
  sessionTimeout: '30 minutes',
  theme: 'light',
  primaryColor: '#FF6A00',
  compactMode: false,
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  enableSsl: true,
};

const AdminSettings: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settings, setSettings] = useState<AdminSettingsData>(defaultSettings);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Hydrate from localStorage immediately for snappy UI
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored && !cancelled) {
          setSettings({ ...defaultSettings, ...JSON.parse(stored) });
        }
      } catch {
        // ignore
      }

      // Then sync from Supabase (source of truth)
      if (!isSupabaseConfigured()) return;
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('data')
          .eq('id', 'global')
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          // table may not exist yet — silently fall back
          if (error.code !== '42P01' && error.code !== 'PGRST205') {
            console.warn('[AdminSettings] load failed:', error.message);
          }
          return;
        }
        if (data?.data && typeof data.data === 'object') {
          const merged = { ...defaultSettings, ...(data.data as Partial<AdminSettingsData>) };
          setSettings(merged);
          try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
        }
      } catch (err) {
        console.warn('[AdminSettings] load error:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const updateSetting = <K extends keyof AdminSettingsData>(key: K, value: AdminSettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Always cache locally
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

      // Persist to Supabase
      if (isSupabaseConfigured()) {
        const { data: userResp } = await supabase.auth.getUser();
        const adminId = userResp?.user?.id ?? null;
        const { error } = await supabase
          .from('admin_settings')
          .upsert({ id: 'global', data: settings, updated_by: adminId } as any, { onConflict: 'id' });
        if (error && error.code !== '42P01' && error.code !== 'PGRST205') {
          console.error('[AdminSettings] Supabase save failed:', error);
          throw error;
        }
        // Best-effort audit log
        try {
          await supabase.from('admin_action_log').insert({
            admin_id: adminId,
            action: 'admin_settings.update',
            target_type: 'admin_settings',
            target_id: 'global',
          } as any);
        } catch { /* ignore */ }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Settings</h1>
                <p className="text-[var(--text-muted)]">Manage platform configuration and preferences</p>
              </div>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className={`${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]'} text-white flex items-center gap-2`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full bg-white border-0 shadow-none rounded-none h-auto p-0 mb-6 gap-0 justify-center">
                {[
                  { value: 'general', label: 'General' },
                  { value: 'notifications', label: 'Notifications' },
                  { value: 'security', label: 'Security' },
                  { value: 'appearance', label: 'Appearance' },
                  { value: 'email', label: 'Email' },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative bg-transparent border-0 rounded-none px-5 py-2 text-xs text-[var(--text-muted)] shadow-none
                      data-[state=active]:bg-transparent data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-none
                      data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0
                      data-[state=active]:after:w-full data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[var(--brand-primary)]
                      data-[state=active]:after:rounded-t-full
                      hover:text-[var(--brand-primary)] transition-colors"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
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
                      <Input id="platform-name" value={settings.platformName} onChange={e => updateSetting('platformName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="support-email">Support Email</Label>
                      <Input id="support-email" type="email" value={settings.supportEmail} onChange={e => updateSetting('supportEmail', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Contact Phone</Label>
                      <Input id="contact-phone" value={settings.contactPhone} onChange={e => updateSetting('contactPhone', e.target.value)} />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-gray-500">Temporarily disable the platform</p>
                      </div>
                      <Switch checked={settings.maintenanceMode} onCheckedChange={v => updateSetting('maintenanceMode', v)} />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Allow New Registrations</Label>
                        <p className="text-sm text-gray-500">Enable new user sign-ups</p>
                      </div>
                      <Switch checked={settings.allowRegistrations} onCheckedChange={v => updateSetting('allowRegistrations', v)} />
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
                    {([
                      { key: 'notifyOrders' as const, label: 'New Order Notifications', description: 'Receive alerts for new orders' },
                      { key: 'notifySellerReg' as const, label: 'Seller Registration', description: 'Notify when sellers register' },
                      { key: 'notifyPayments' as const, label: 'Payment Alerts', description: 'Get notified of payment activities' },
                      { key: 'notifyDisputes' as const, label: 'Dispute Notifications', description: 'Alerts for customer disputes' },
                      { key: 'notifySystem' as const, label: 'System Alerts', description: 'Technical and system notifications' }
                    ]).map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <Label>{setting.label}</Label>
                          <p className="text-sm text-gray-500">{setting.description}</p>
                        </div>
                        <Switch checked={settings[setting.key]} onCheckedChange={v => updateSetting(setting.key, v)} />
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
                      <Switch checked={settings.twoFactorAuth} onCheckedChange={v => updateSetting('twoFactorAuth', v)} />
                    </div>
                    <div className="flex items-center justify-between py-4 border-t">
                      <div>
                        <Label>Session Timeout</Label>
                        <p className="text-sm text-gray-500">Auto logout after inactivity</p>
                      </div>
                      <select
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        value={settings.sessionTimeout}
                        onChange={e => updateSetting('sessionTimeout', e.target.value)}
                      >
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
                        <button onClick={() => updateSetting('theme', 'light')} className={`p-4 border-2 ${settings.theme === 'light' ? 'border-orange-500' : 'border-gray-300 hover:border-orange-500'} rounded-lg bg-white`}>
                          <div className="w-full h-20 bg-gradient-to-br from-white to-gray-100 rounded mb-2"></div>
                          <span className="text-sm font-medium">Light</span>
                        </button>
                        <button onClick={() => updateSetting('theme', 'dark')} className={`p-4 border-2 ${settings.theme === 'dark' ? 'border-orange-500' : 'border-gray-300 hover:border-orange-500'} rounded-lg bg-white`}>
                          <div className="w-full h-20 bg-gradient-to-br from-gray-800 to-gray-900 rounded mb-2"></div>
                          <span className="text-sm font-medium">Dark</span>
                        </button>
                        <button onClick={() => updateSetting('theme', 'auto')} className={`p-4 border-2 ${settings.theme === 'auto' ? 'border-orange-500' : 'border-gray-300 hover:border-orange-500'} rounded-lg bg-white`}>
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
                            onClick={() => updateSetting('primaryColor', color)}
                            className={`w-12 h-12 rounded-lg border-2 ${settings.primaryColor === color ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400' : 'border-gray-300 hover:border-gray-400'}`}
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
                      <Switch checked={settings.compactMode} onCheckedChange={v => updateSetting('compactMode', v)} />
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
                      <Input id="smtp-host" placeholder="smtp.example.com" value={settings.smtpHost} onChange={e => updateSetting('smtpHost', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-port">SMTP Port</Label>
                      <Input id="smtp-port" placeholder="587" value={settings.smtpPort} onChange={e => updateSetting('smtpPort', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp-user">SMTP Username</Label>
                      <Input id="smtp-user" placeholder="noreply@bazaarph.com" value={settings.smtpUser} onChange={e => updateSetting('smtpUser', e.target.value)} />
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
                      <Switch checked={settings.enableSsl} onCheckedChange={v => updateSetting('enableSsl', v)} />
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
