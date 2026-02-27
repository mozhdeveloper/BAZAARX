import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Receipt,
  Calculator,
  Users,
  DollarSign,
  Scan,
  Building2,
  Save,
  ArrowLeft,
  Printer,
  CreditCard,
  ShoppingBag,
  Percent,
  FileText,
  UserCog,
  BarChart3,
  Lock,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Loader2,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { useAuthStore } from '@/stores/sellerStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { POSSettings } from '@/types/pos.types';
import {
  getPOSSettings,
  savePOSSettings,
  getDefaultPOSSettings,
  checkPOSSettingsTableExists
} from '@/services/posSettingsService';

export default function SellerPOSSettings() {
  const navigate = useNavigate();
  const { seller } = useAuthStore();
  const { toast } = useToast();
  const [settings, setSettings] = useState<POSSettings>(getDefaultPOSSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [tableExists, setTableExists] = useState(false);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      if (!seller?.id) return;

      setIsLoading(true);
      try {
        // Check if database table exists
        const exists = await checkPOSSettingsTableExists();
        setTableExists(exists);

        if (exists) {
          // Try to load from database
          const dbSettings = await getPOSSettings(seller.id);
          if (dbSettings) {
            setSettings(dbSettings);
          } else {
            // No settings in DB, use defaults
            setSettings(getDefaultPOSSettings(seller.id));
          }
        } else {
          // Table doesn't exist, load from localStorage
          const localSettings = localStorage.getItem(`pos_settings_${seller.id}`);
          if (localSettings) {
            setSettings(JSON.parse(localSettings));
          } else {
            setSettings(getDefaultPOSSettings(seller.id));
          }
        }
      } catch (error) {
        console.error('Error loading POS settings:', error);
        toast({
          title: 'Error Loading Settings',
          description: 'Using default settings. Changes will be saved to browser storage only.',
          variant: 'destructive',
        });
        setSettings(getDefaultPOSSettings(seller.id));
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [seller?.id, toast]);



  const updateSetting = <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSave = async () => {
    if (!seller?.id) return;

    setIsSaving(true);

    try {
      // Save to database (with localStorage fallback)
      const savedSettings = await savePOSSettings(seller.id, settings);
      setSettings(savedSettings);

      toast({
        title: '✅ Settings Saved',
        description: tableExists
          ? 'Your POS settings have been saved successfully.'
          : 'Settings saved to browser storage. Database table not yet created.',
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: '❌ Save Failed',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePaymentMethod = (method: 'cash' | 'card' | 'ewallet' | 'bank_transfer') => {
    const current = settings.acceptedPaymentMethods;
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
    updateSetting('acceptedPaymentMethods', updated);
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
        <div className="w-full max-w-7xl mx-auto space-y-8 pb-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight flex items-center gap-3">
                POS Settings
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">Configure your point of sale system with advanced features</p>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-bold px-8 shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          {/* Database Status Banner */}
          {!tableExists && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-sm">Database Table Not Found</h3>
                <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                  The <code className="px-1.5 py-0.5 bg-amber-100/50 rounded text-[10px] font-mono">pos_settings</code> table hasn't been created yet.
                  Settings will be saved to your browser's local storage. To enable database persistence, run the migration provided in the test documentation.
                </p>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6A00] mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading settings...</p>
              </div>
            </div>
          ) : (
            <>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto scrollbar-hide pb-2">
                  <TabsList className="inline-flex h-auto p-1.5 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-max">
                    <TabsTrigger
                      value="general"
                      className="px-6 py-2 rounded-full data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 transition-all duration-300 gap-2 text-xs font-bold text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      General
                    </TabsTrigger>
                    <TabsTrigger
                      value="tax"
                      className="px-6 py-2 rounded-full data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 transition-all duration-300 gap-2 text-xs font-bold text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      Tax
                    </TabsTrigger>
                    <TabsTrigger
                      value="receipt"
                      className="px-6 py-2 rounded-full data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 transition-all duration-300 gap-2 text-xs font-bold text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      Receipt
                    </TabsTrigger>
                    <TabsTrigger
                      value="cash-drawer"
                      className="px-6 py-2 rounded-full data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 transition-all duration-300 gap-2 text-xs font-bold text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Cash Drawer
                    </TabsTrigger>
                    <TabsTrigger
                      value="staff"
                      className="px-6 py-2 rounded-full data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 transition-all duration-300 gap-2 text-xs font-bold text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Staff
                    </TabsTrigger>
                    <TabsTrigger
                      value="advanced"
                      className="px-6 py-2 rounded-full data-[state=active]:bg-[var(--brand-primary)] data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20 transition-all duration-300 gap-2 text-xs font-bold text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      Advanced
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-6">
                  <Card className="p-8 border-0 shadow-md rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      Payment Methods
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Cash Payments</Label>
                          <p className="text-sm text-[var(--text-muted)]">Accept physical cash transactions</p>
                        </div>
                        <Switch
                          checked={settings.acceptedPaymentMethods.includes('cash')}
                          onCheckedChange={() => togglePaymentMethod('cash')}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Card Payments</Label>
                          <p className="text-sm text-[var(--text-muted)]">Accept credit/debit cards</p>
                        </div>
                        <Switch
                          checked={settings.acceptedPaymentMethods.includes('card')}
                          onCheckedChange={() => togglePaymentMethod('card')}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100/50">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">E-Wallet Payments</Label>
                          <p className="text-sm text-[var(--text-muted)]">GCash, PayMaya, etc.</p>
                        </div>
                        <Switch
                          checked={settings.acceptedPaymentMethods.includes('ewallet')}
                          onCheckedChange={() => togglePaymentMethod('ewallet')}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100/50">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Bank Transfer</Label>
                          <p className="text-sm text-[var(--text-muted)]">Accept direct bank deposits</p>
                        </div>
                        <Switch
                          checked={settings.acceptedPaymentMethods.includes('bank_transfer')}
                          onCheckedChange={() => togglePaymentMethod('bank_transfer')}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      Barcode Scanner
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Enable Barcode Scanner</Label>
                          <p className="text-sm text-gray-500">Scan products using barcode</p>
                        </div>
                        <Switch
                          checked={settings.enableBarcodeScanner}
                          onCheckedChange={(checked) => updateSetting('enableBarcodeScanner', checked)}
                        />
                      </div>

                      {settings.enableBarcodeScanner && (
                        <>
                          <div className="space-y-2">
                            <Label>Scanner Type</Label>
                            <Select
                              value={settings.scannerType}
                              onValueChange={(value: 'camera' | 'usb' | 'bluetooth') =>
                                updateSetting('scannerType', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="usb">
                                  <div className="flex flex-col">
                                    <span>USB Scanner (Hardware)</span>
                                    <span className="text-xs text-gray-400">YHDAIA, Honeywell, etc.</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="camera">Camera (Built-in)</SelectItem>
                                <SelectItem value="bluetooth">Bluetooth Scanner</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-gray-500">
                              {settings.scannerType === 'usb' && 'Hardware USB scanners auto-detect scans in background'}
                              {settings.scannerType === 'camera' && 'Use device camera to scan barcodes'}
                              {settings.scannerType === 'bluetooth' && 'Connect wireless Bluetooth scanner'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base">Auto-add on Scan</Label>
                              <p className="text-sm text-gray-500">Automatically add product to cart</p>
                            </div>
                            <Switch
                              checked={settings.autoAddOnScan}
                              onCheckedChange={(checked) => updateSetting('autoAddOnScan', checked)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      Multi-Branch Support
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Enable Multi-Branch</Label>
                          <p className="text-sm text-gray-500">Manage multiple store locations</p>
                        </div>
                        <Switch
                          checked={settings.enableMultiBranch}
                          onCheckedChange={(checked) => updateSetting('enableMultiBranch', checked)}
                        />
                      </div>

                      {settings.enableMultiBranch && (
                        <div className="bg-blue-50/50 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-6 mt-4 group/box transition-all hover:bg-blue-50">
                          <p className="text-sm text-blue-800 leading-relaxed">
                            <strong className="text-blue-900 block mb-1">Multi-Branch Management</strong>
                            Multi-branch mode allows you to manage inventory and sales across multiple locations.
                            Configure your branches in the dedicated section to track performance per location.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                            onClick={() => navigate('/seller/branches')}
                          >
                            Manage Branches
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-6 border-0 shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Additional Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Low Stock Alerts</Label>
                          <p className="text-sm text-gray-500">Get notified when stock is low</p>
                        </div>
                        <Switch
                          checked={settings.enableLowStockAlert}
                          onCheckedChange={(checked) => updateSetting('enableLowStockAlert', checked)}
                        />
                      </div>

                      {settings.enableLowStockAlert && (
                        <div className="space-y-2">
                          <Label>Low Stock Threshold</Label>
                          <Input
                            type="number"
                            value={settings.lowStockThreshold}
                            onChange={(e) => updateSetting('lowStockThreshold', parseInt(e.target.value) || 10)}
                            min={1}
                          />
                          <p className="text-xs text-gray-500">Alert when stock falls below this number</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Sound Effects</Label>
                          <p className="text-sm text-gray-500">Play sounds for actions</p>
                        </div>
                        <Switch
                          checked={settings.enableSoundEffects}
                          onCheckedChange={(checked) => updateSetting('enableSoundEffects', checked)}
                        />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Tax Settings */}
                <TabsContent value="tax" className="space-y-6">
                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-orange-100/50 rounded-xl">
                        <Percent className="h-5 w-5 text-[var(--brand-primary)]" />
                      </div>
                      Tax Configuration
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Enable Tax Calculation</Label>
                          <p className="text-sm text-[var(--text-muted)]">Apply tax to all sales</p>
                        </div>
                        <Switch
                          checked={settings.enableTax}
                          onCheckedChange={(checked) => updateSetting('enableTax', checked)}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>

                      {settings.enableTax && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-bold text-[var(--text-headline)]">Tax Name</Label>
                              <Input
                                value={settings.taxName}
                                onChange={(e) => updateSetting('taxName', e.target.value)}
                                placeholder="e.g., VAT, Sales Tax"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-[var(--text-headline)]">Tax Rate (%)</Label>
                              <Input
                                type="number"
                                value={settings.taxRate}
                                onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value) || 0)}
                                min={0}
                                max={100}
                                step={0.01}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-bold text-[var(--text-headline)]">Tax Included in Price</Label>
                              <p className="text-sm text-[var(--text-muted)]">Is tax already included in product prices?</p>
                            </div>
                            <Switch
                              checked={settings.taxIncludedInPrice}
                              onCheckedChange={(checked) => updateSetting('taxIncludedInPrice', checked)}
                              className="data-[state=checked]:bg-[var(--brand-primary)]"
                            />
                          </div>

                          <div className="bg-amber-50/50 backdrop-blur-sm border border-amber-100/50 rounded-2xl p-6 mt-6">
                            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                              <Calculator className="h-4 w-4 text-[var(--brand-primary)]" />
                              Tax Calculation Preview
                            </h4>
                            <div className="text-sm text-slate-700 space-y-2 font-medium">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                                <span>Example Sale Amount</span>
                                <span className="font-bold">₱1,000.00</span>
                              </div>
                              {settings.taxIncludedInPrice ? (
                                <>
                                  <div className="flex justify-between items-center text-xs opacity-80">
                                    <span>Tax ({settings.taxRate}%)</span>
                                    <span>₱{((1000 * settings.taxRate) / (100 + settings.taxRate)).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs opacity-80">
                                    <span>Net Amount</span>
                                    <span>₱{(1000 - (1000 * settings.taxRate) / (100 + settings.taxRate)).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 text-[var(--brand-primary)]">
                                    <span className="font-bold">Total Collection</span>
                                    <span className="font-black text-lg">₱1,000.00</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between items-center text-xs opacity-80">
                                    <span>Subtotal</span>
                                    <span>₱1,000.00</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs opacity-80">
                                    <span>Tax ({settings.taxRate}%)</span>
                                    <span>₱{((1000 * settings.taxRate) / 100).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 text-[var(--brand-primary)]">
                                    <span className="font-bold">Total Collection</span>
                                    <span className="font-black text-lg">₱{(1000 + (1000 * settings.taxRate) / 100).toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Receipt Settings */}
                <TabsContent value="receipt" className="space-y-6">
                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-orange-100/50 rounded-xl">
                        <FileText className="h-5 w-5 text-[var(--brand-primary)]" />
                      </div>
                      Receipt Customization
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="font-bold text-[var(--text-headline)]">Receipt Template</Label>
                        <Select
                          value={settings.receiptTemplate}
                          onValueChange={(value: 'standard' | 'minimal' | 'detailed') =>
                            updateSetting('receiptTemplate', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-[var(--text-headline)]">Receipt Header</Label>
                        <Textarea
                          value={settings.receiptHeader}
                          onChange={(e) => updateSetting('receiptHeader', e.target.value)}
                          placeholder="Message at the top of receipt"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="font-bold text-[var(--text-headline)]">Receipt Footer</Label>
                        <Textarea
                          value={settings.receiptFooter}
                          onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                          placeholder="Message at the bottom of receipt"
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Show Logo on Receipt</Label>
                          <p className="text-sm text-[var(--text-muted)]">Display your store logo</p>
                        </div>
                        <Switch
                          checked={settings.showLogo}
                          onCheckedChange={(checked) => updateSetting('showLogo', checked)}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>

                      {settings.showLogo && (
                        <div className="space-y-2">
                          <Label className="font-bold text-[var(--text-headline)]">Logo URL</Label>
                          <Input
                            value={settings.logoUrl || ''}
                            onChange={(e) => updateSetting('logoUrl', e.target.value)}
                            placeholder="https://example.com/logo.png"
                          />
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-blue-100/50 rounded-xl">
                        <Printer className="h-5 w-5 text-blue-600" />
                      </div>
                      Printer Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Auto-Print Receipt</Label>
                          <p className="text-sm text-[var(--text-muted)]">Automatically print after each sale</p>
                        </div>
                        <Switch
                          checked={settings.autoPrintReceipt}
                          onCheckedChange={(checked) => updateSetting('autoPrintReceipt', checked)}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>

                      {settings.autoPrintReceipt && (
                        <div className="space-y-2">
                          <Label className="font-bold text-[var(--text-headline)]">Printer Name</Label>
                          <Input
                            value={settings.printerName || ''}
                            onChange={(e) => updateSetting('printerName', e.target.value)}
                            placeholder="e.g., EPSON TM-T82"
                          />
                          <p className="text-xs text-[var(--text-muted)]">
                            Leave blank to use default printer. Make sure your printer is connected and supports web printing.
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-50/50 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-6">
                        <h4 className="font-bold text-blue-900 mb-3">Supported Hardware</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Thermal Printers (80mm)
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            ESC/POS Compatible
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Office Printers (A4)
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            Network/IP Printers
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Cash Drawer Settings */}
                <TabsContent value="cash-drawer" className="space-y-6">
                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-green-100/50 rounded-xl">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      Cash Drawer Management
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Enable Cash Drawer</Label>
                          <p className="text-sm text-[var(--text-muted)]">Track cash and shift sessions</p>
                        </div>
                        <Switch
                          checked={settings.enableCashDrawer}
                          onCheckedChange={(checked) => updateSetting('enableCashDrawer', checked)}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>

                      {settings.enableCashDrawer && (
                        <>
                          <div className="space-y-2">
                            <Label className="font-bold text-[var(--text-headline)]">Default Opening Cash (₱)</Label>
                            <Input
                              type="number"
                              value={settings.openingCash}
                              onChange={(e) => updateSetting('openingCash', parseFloat(e.target.value) || 0)}
                              min={0}
                              step={100}
                            />
                            <p className="text-xs text-[var(--text-muted)]">
                              Amount of cash to start each shift with
                            </p>
                          </div>

                          <div className="bg-green-50/50 backdrop-blur-sm border border-green-100/50 rounded-2xl p-6 mt-4">
                            <h4 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Cash Drawer Features
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                              {[
                                'Track opening and closing balances',
                                'Record cash in/out transactions',
                                'Automatic discrepancy detection',
                                'Shift session reports',
                                'Cash reconciliation tools'
                              ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-green-800 font-medium">
                                  <div className="shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-green-600" />
                                  </div>
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate('/seller/cash-drawer')}
                          >
                            View Cash Drawer Sessions
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Staff Settings */}
                <TabsContent value="staff" className="space-y-6">
                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-purple-100/50 rounded-xl">
                        <UserCog className="h-5 w-5 text-purple-600" />
                      </div>
                      Staff Management
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-bold text-[var(--text-headline)]">Enable Staff Tracking</Label>
                          <p className="text-sm text-[var(--text-muted)]">Track which staff member makes sales</p>
                        </div>
                        <Switch
                          checked={settings.enableStaffTracking}
                          onCheckedChange={(checked) => updateSetting('enableStaffTracking', checked)}
                          className="data-[state=checked]:bg-[var(--brand-primary)]"
                        />
                      </div>

                      {settings.enableStaffTracking && (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-bold text-[var(--text-headline)]">Require Staff Login</Label>
                              <p className="text-sm text-[var(--text-muted)]">Staff must log in before using POS</p>
                            </div>
                            <Switch
                              checked={settings.requireStaffLogin}
                              onCheckedChange={(checked) => updateSetting('requireStaffLogin', checked)}
                              className="data-[state=checked]:bg-[var(--brand-primary)]"
                            />
                          </div>

                          <div className="bg-purple-50/50 backdrop-blur-sm border border-purple-100/50 rounded-2xl p-6 mt-4">
                            <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Staff Management Capabilities
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                              {[
                                'Individual staff accounts',
                                'PIN-based quick login',
                                'Role-based permissions',
                                'Sales performance tracking',
                                'Activity logs and audit trails'
                              ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm text-purple-800 font-medium">
                                  <div className="shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-purple-600" />
                                  </div>
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => navigate('/seller/staff')}
                          >
                            Manage Staff Members
                          </Button>
                        </>
                      )}
                    </div>
                  </Card>
                </TabsContent>

                {/* Advanced Settings */}
                <TabsContent value="advanced" className="space-y-6">
                  <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <h3 className="text-xl font-black text-[var(--text-headline)] mb-6 flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-gray-100/50 rounded-xl">
                        <BarChart3 className="h-5 w-5 text-gray-600" />
                      </div>
                      Advanced Features
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-gray-50/50 backdrop-blur-sm border border-gray-100/50 rounded-2xl p-6">
                        <h4 className="font-bold text-gray-900 mb-4">Coming Soon</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                          {[
                            'Customer loyalty programs',
                            'Advanced discount rules',
                            'Inventory forecasting',
                            'Integration with accounting software',
                            'Multi-currency support',
                            'Custom receipt templates'
                          ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

