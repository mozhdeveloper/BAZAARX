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
  LogOut
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
    <div className="flex h-screen bg-gray-50">
      <SellerSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto scrollbar-hide relative">
          <div className="w-full max-w-7xl mx-auto space-y-8 relative z-10 pb-10">
            {/* Header */}
            <div className="mb-8">

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    POS Settings
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Configure your point of sale system with advanced features
                  </p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#FF6A00] hover:bg-[#E65F00] text-white gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>

            {/* Database Status Banner */}
            {!tableExists && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900">Database Table Not Found</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    The <code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs">pos_settings</code> table hasn't been created yet.
                    Settings will be saved to your browser's local storage. To enable database persistence, run the migration provided in the test documentation.
                  </p>
                </div>
              </div>
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
                {/* Settings Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-6 mb-8">
                    <TabsTrigger value="general" className="gap-2">
                      <Settings className="h-4 w-4" />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="tax" className="gap-2">
                      <Calculator className="h-4 w-4" />
                      Tax
                    </TabsTrigger>
                    <TabsTrigger value="receipt" className="gap-2">
                      <Receipt className="h-4 w-4" />
                      Receipt
                    </TabsTrigger>
                    <TabsTrigger value="cash-drawer" className="gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cash Drawer
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="gap-2">
                      <Users className="h-4 w-4" />
                      Staff
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Advanced
                    </TabsTrigger>
                  </TabsList>

                  {/* General Settings */}
                  <TabsContent value="general" className="space-y-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-[#FF6A00]" />
                        Payment Methods
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Cash Payments</Label>
                            <p className="text-sm text-gray-500">Accept cash payments</p>
                          </div>
                          <Switch
                            checked={settings.acceptedPaymentMethods.includes('cash')}
                            onCheckedChange={() => togglePaymentMethod('cash')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Card Payments</Label>
                            <p className="text-sm text-gray-500">Accept credit/debit cards</p>
                          </div>
                          <Switch
                            checked={settings.acceptedPaymentMethods.includes('card')}
                            onCheckedChange={() => togglePaymentMethod('card')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">E-Wallet Payments</Label>
                            <p className="text-sm text-gray-500">GCash, PayMaya, etc.</p>
                          </div>
                          <Switch
                            checked={settings.acceptedPaymentMethods.includes('ewallet')}
                            onCheckedChange={() => togglePaymentMethod('ewallet')}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Bank Transfer</Label>
                            <p className="text-sm text-gray-500">Accept bank transfers</p>
                          </div>
                          <Switch
                            checked={settings.acceptedPaymentMethods.includes('bank_transfer')}
                            onCheckedChange={() => togglePaymentMethod('bank_transfer')}
                          />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Scan className="h-5 w-5 text-[#FF6A00]" />
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

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#FF6A00]" />
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
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <p className="text-sm text-blue-800">
                              <strong>Note:</strong> Multi-branch mode allows you to manage inventory and sales across multiple locations.
                              Configure your branches in the Branches section.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => navigate('/seller/branches')}
                            >
                              Manage Branches
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-6">
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
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Percent className="h-5 w-5 text-[#FF6A00]" />
                        Tax Configuration
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Enable Tax Calculation</Label>
                            <p className="text-sm text-gray-500">Apply tax to all sales</p>
                          </div>
                          <Switch
                            checked={settings.enableTax}
                            onCheckedChange={(checked) => updateSetting('enableTax', checked)}
                          />
                        </div>

                        {settings.enableTax && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Tax Name</Label>
                                <Input
                                  value={settings.taxName}
                                  onChange={(e) => updateSetting('taxName', e.target.value)}
                                  placeholder="e.g., VAT, Sales Tax"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Tax Rate (%)</Label>
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
                                <Label className="text-base">Tax Included in Price</Label>
                                <p className="text-sm text-gray-500">Is tax already included in product prices?</p>
                              </div>
                              <Switch
                                checked={settings.taxIncludedInPrice}
                                onCheckedChange={(checked) => updateSetting('taxIncludedInPrice', checked)}
                              />
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                              <h4 className="font-medium text-amber-900 mb-2">Tax Calculation Preview</h4>
                              <div className="text-sm text-amber-800 space-y-1">
                                <p><strong>Example Sale:</strong> ₱1,000</p>
                                {settings.taxIncludedInPrice ? (
                                  <>
                                    <p>Tax ({settings.taxRate}%): ₱{((1000 * settings.taxRate) / (100 + settings.taxRate)).toFixed(2)}</p>
                                    <p>Net Amount: ₱{(1000 - (1000 * settings.taxRate) / (100 + settings.taxRate)).toFixed(2)}</p>
                                    <p className="font-semibold">Total: ₱1,000.00</p>
                                  </>
                                ) : (
                                  <>
                                    <p>Subtotal: ₱1,000.00</p>
                                    <p>Tax ({settings.taxRate}%): ₱{((1000 * settings.taxRate) / 100).toFixed(2)}</p>
                                    <p className="font-semibold">Total: ₱{(1000 + (1000 * settings.taxRate) / 100).toFixed(2)}</p>
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
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#FF6A00]" />
                        Receipt Customization
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Receipt Template</Label>
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
                          <Label>Receipt Header</Label>
                          <Textarea
                            value={settings.receiptHeader}
                            onChange={(e) => updateSetting('receiptHeader', e.target.value)}
                            placeholder="Message at the top of receipt"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Receipt Footer</Label>
                          <Textarea
                            value={settings.receiptFooter}
                            onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                            placeholder="Message at the bottom of receipt"
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Show Logo on Receipt</Label>
                            <p className="text-sm text-gray-500">Display your store logo</p>
                          </div>
                          <Switch
                            checked={settings.showLogo}
                            onCheckedChange={(checked) => updateSetting('showLogo', checked)}
                          />
                        </div>

                        {settings.showLogo && (
                          <div className="space-y-2">
                            <Label>Logo URL</Label>
                            <Input
                              value={settings.logoUrl || ''}
                              onChange={(e) => updateSetting('logoUrl', e.target.value)}
                              placeholder="https://example.com/logo.png"
                            />
                          </div>
                        )}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Printer className="h-5 w-5 text-[#FF6A00]" />
                        Printer Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Auto-Print Receipt</Label>
                            <p className="text-sm text-gray-500">Automatically print after each sale</p>
                          </div>
                          <Switch
                            checked={settings.autoPrintReceipt}
                            onCheckedChange={(checked) => updateSetting('autoPrintReceipt', checked)}
                          />
                        </div>

                        {settings.autoPrintReceipt && (
                          <div className="space-y-2">
                            <Label>Printer Name</Label>
                            <Input
                              value={settings.printerName || ''}
                              onChange={(e) => updateSetting('printerName', e.target.value)}
                              placeholder="e.g., EPSON TM-T82"
                            />
                            <p className="text-xs text-gray-500">
                              Leave blank to use default printer. Make sure your printer is connected and supports web printing.
                            </p>
                          </div>
                        )}

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-medium text-blue-900 mb-2">Supported Printers</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Thermal receipt printers (80mm)</li>
                            <li>• ESC/POS compatible printers</li>
                            <li>• Standard office printers (A4/Letter)</li>
                            <li>• Network printers (via IP address)</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  {/* Cash Drawer Settings */}
                  <TabsContent value="cash-drawer" className="space-y-6">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-[#FF6A00]" />
                        Cash Drawer Management
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Enable Cash Drawer</Label>
                            <p className="text-sm text-gray-500">Track cash and shift sessions</p>
                          </div>
                          <Switch
                            checked={settings.enableCashDrawer}
                            onCheckedChange={(checked) => updateSetting('enableCashDrawer', checked)}
                          />
                        </div>

                        {settings.enableCashDrawer && (
                          <>
                            <div className="space-y-2">
                              <Label>Default Opening Cash (₱)</Label>
                              <Input
                                type="number"
                                value={settings.openingCash}
                                onChange={(e) => updateSetting('openingCash', parseFloat(e.target.value) || 0)}
                                min={0}
                                step={100}
                              />
                              <p className="text-xs text-gray-500">
                                Amount of cash to start each shift with
                              </p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                              <h4 className="font-medium text-green-900 mb-2">Cash Drawer Features</h4>
                              <ul className="text-sm text-green-800 space-y-1">
                                <li>✓ Track opening and closing balances</li>
                                <li>✓ Record cash in/out transactions</li>
                                <li>✓ Automatic discrepancy detection</li>
                                <li>✓ Shift session reports</li>
                                <li>✓ Cash reconciliation tools</li>
                              </ul>
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
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <UserCog className="h-5 w-5 text-[#FF6A00]" />
                        Staff Management
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Enable Staff Tracking</Label>
                            <p className="text-sm text-gray-500">Track which staff member makes sales</p>
                          </div>
                          <Switch
                            checked={settings.enableStaffTracking}
                            onCheckedChange={(checked) => updateSetting('enableStaffTracking', checked)}
                          />
                        </div>

                        {settings.enableStaffTracking && (
                          <>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base">Require Staff Login</Label>
                                <p className="text-sm text-gray-500">Staff must log in before using POS</p>
                              </div>
                              <Switch
                                checked={settings.requireStaffLogin}
                                onCheckedChange={(checked) => updateSetting('requireStaffLogin', checked)}
                              />
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
                              <h4 className="font-medium text-purple-900 mb-2">Staff Features</h4>
                              <ul className="text-sm text-purple-800 space-y-1">
                                <li>✓ Individual staff accounts</li>
                                <li>✓ PIN-based quick login</li>
                                <li>✓ Role-based permissions</li>
                                <li>✓ Sales performance tracking</li>
                                <li>✓ Activity logs and audit trails</li>
                              </ul>
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
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-[#FF6A00]" />
                        Advanced Features
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Coming Soon</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Customer loyalty programs</li>
                            <li>• Advanced discount rules</li>
                            <li>• Inventory forecasting</li>
                            <li>• Integration with accounting software</li>
                            <li>• Multi-currency support</li>
                            <li>• Custom receipt templates</li>
                          </ul>
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
    </div>
  );
}

