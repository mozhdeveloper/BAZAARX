/**
 * POS Settings Modal Component
 * Inline settings dialog for POS configuration
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  Receipt,
  Calculator,
  Users,
  DollarSign,
  Scan,
  Building2,
  Save,
  Printer,
  CreditCard,
  Percent,
  X,
  Wallet,
  Banknote,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { POSSettings } from '@/types/pos.types';
import { 
  getPOSSettings, 
  savePOSSettings, 
  getDefaultPOSSettings,
} from '@/services/posSettingsService';

interface POSSettingsModalProps {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  onSettingsChange?: (settings: POSSettings) => void;
}

export function POSSettingsModal({ 
  open, 
  onClose, 
  sellerId,
  onSettingsChange 
}: POSSettingsModalProps) {
  const [settings, setSettings] = useState<POSSettings>(getDefaultPOSSettings(sellerId));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    async function loadSettings() {
      if (!open || !sellerId) return;
      
      setIsLoading(true);
      try {
        const dbSettings = await getPOSSettings(sellerId);
        if (dbSettings) {
          setSettings(dbSettings);
        } else {
          setSettings(getDefaultPOSSettings(sellerId));
        }
      } catch (error) {
        console.error('Error loading POS settings:', error);
        setSettings(getDefaultPOSSettings(sellerId));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSettings();
  }, [open, sellerId]);

  const updateSetting = <K extends keyof POSSettings>(key: K, value: POSSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const savedSettings = await savePOSSettings(sellerId, settings);
      setSettings(savedSettings);
      onSettingsChange?.(savedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#FF6A00]/10 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FF6A00] rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">POS Settings</DialogTitle>
                <p className="text-sm text-muted-foreground">Configure your point of sale system</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "gap-2 transition-all",
                saveSuccess 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-[#FF6A00] hover:bg-[#E65F00]"
              )}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF6A00] mx-auto"></div>
              <p className="text-gray-600 mt-3 text-sm">Loading settings...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[calc(90vh-120px)]">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="general" className="gap-1.5 text-xs">
                    <Settings className="h-3.5 w-3.5" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="tax" className="gap-1.5 text-xs">
                    <Calculator className="h-3.5 w-3.5" />
                    Tax
                  </TabsTrigger>
                  <TabsTrigger value="receipt" className="gap-1.5 text-xs">
                    <Receipt className="h-3.5 w-3.5" />
                    Receipt
                  </TabsTrigger>
                  <TabsTrigger value="cash" className="gap-1.5 text-xs">
                    <DollarSign className="h-3.5 w-3.5" />
                    Cash
                  </TabsTrigger>
                  <TabsTrigger value="staff" className="gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    Staff
                  </TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#FF6A00]" />
                      Payment Methods
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'card', label: 'Card', icon: CreditCard },
                        { id: 'ewallet', label: 'E-Wallet', icon: Wallet },
                        { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                      ].map((method) => (
                        <button
                          key={method.id}
                          onClick={() => togglePaymentMethod(method.id as any)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                            settings.acceptedPaymentMethods.includes(method.id as any)
                              ? "border-[#FF6A00] bg-orange-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <method.icon className={cn(
                            "h-5 w-5",
                            settings.acceptedPaymentMethods.includes(method.id as any)
                              ? "text-[#FF6A00]"
                              : "text-gray-400"
                          )} />
                          <span className="font-medium text-sm">{method.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Scan className="h-4 w-4 text-[#FF6A00]" />
                      Barcode Scanner
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Barcode Scanner</Label>
                          <p className="text-xs text-muted-foreground">Scan products with camera or USB scanner</p>
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
                                    <span className="text-xs text-muted-foreground">YHDAIA, Honeywell, etc.</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="camera">Camera (Built-in)</SelectItem>
                                <SelectItem value="bluetooth">Bluetooth Scanner</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {settings.scannerType === 'usb' && 'Hardware USB scanners auto-detect scans in background'}
                              {settings.scannerType === 'camera' && 'Use device camera to scan barcodes'}
                              {settings.scannerType === 'bluetooth' && 'Connect wireless Bluetooth scanner'}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>Auto-add to Cart</Label>
                              <p className="text-xs text-muted-foreground">Automatically add scanned products</p>
                            </div>
                            <Switch
                              checked={settings.autoAddOnScan}
                              onCheckedChange={(checked) => updateSetting('autoAddOnScan', checked)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      {settings.enableSoundEffects ? (
                        <Volume2 className="h-4 w-4 text-[#FF6A00]" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-gray-400" />
                      )}
                      Sound & Alerts
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Sound Effects</Label>
                          <p className="text-xs text-muted-foreground">Play sounds for scans and sales</p>
                        </div>
                        <Switch
                          checked={settings.enableSoundEffects}
                          onCheckedChange={(checked) => updateSetting('enableSoundEffects', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Low Stock Alerts</Label>
                          <p className="text-xs text-muted-foreground">Warn when stock is low</p>
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
                            min={1}
                            value={settings.lowStockThreshold}
                            onChange={(e) => updateSetting('lowStockThreshold', parseInt(e.target.value) || 10)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#FF6A00]" />
                      Multi-Branch
                    </h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Enable Multi-Branch</Label>
                        <p className="text-xs text-muted-foreground">Manage multiple store locations</p>
                      </div>
                      <Switch
                        checked={settings.enableMultiBranch}
                        onCheckedChange={(checked) => updateSetting('enableMultiBranch', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tax Settings */}
                <TabsContent value="tax" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Percent className="h-4 w-4 text-[#FF6A00]" />
                      Tax Configuration
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Tax</Label>
                          <p className="text-xs text-muted-foreground">Calculate tax on sales</p>
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
                                min={0}
                                max={100}
                                step={0.01}
                                value={settings.taxRate}
                                onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <Label>Tax Included in Price</Label>
                              <p className="text-xs text-muted-foreground">
                                {settings.taxIncludedInPrice 
                                  ? "Prices already include tax" 
                                  : "Tax will be added to prices"}
                              </p>
                            </div>
                            <Switch
                              checked={settings.taxIncludedInPrice}
                              onCheckedChange={(checked) => updateSetting('taxIncludedInPrice', checked)}
                            />
                          </div>

                          {/* Tax Preview */}
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Tax Preview (₱1,000 sale)</h4>
                            <div className="space-y-1 text-sm">
                              {settings.taxIncludedInPrice ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Net Amount:</span>
                                    <span>₱{(1000 / (1 + settings.taxRate / 100)).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">{settings.taxName} ({settings.taxRate}%):</span>
                                    <span>₱{(1000 - 1000 / (1 + settings.taxRate / 100)).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t pt-1">
                                    <span>Total:</span>
                                    <span>₱1,000.00</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span>₱1,000.00</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">{settings.taxName} ({settings.taxRate}%):</span>
                                    <span>₱{(1000 * settings.taxRate / 100).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t pt-1">
                                    <span>Total:</span>
                                    <span>₱{(1000 * (1 + settings.taxRate / 100)).toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Receipt Settings */}
                <TabsContent value="receipt" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-[#FF6A00]" />
                      Receipt Customization
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Receipt Header</Label>
                        <Textarea
                          value={settings.receiptHeader}
                          onChange={(e) => updateSetting('receiptHeader', e.target.value)}
                          placeholder="Header message on receipt"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Receipt Footer</Label>
                        <Textarea
                          value={settings.receiptFooter}
                          onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                          placeholder="Footer message on receipt"
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show Store Logo</Label>
                          <p className="text-xs text-muted-foreground">Display logo on receipts</p>
                        </div>
                        <Switch
                          checked={settings.showLogo}
                          onCheckedChange={(checked) => updateSetting('showLogo', checked)}
                        />
                      </div>

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
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Printer className="h-4 w-4 text-[#FF6A00]" />
                      Printing
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-Print Receipt</Label>
                          <p className="text-xs text-muted-foreground">Print after each sale</p>
                        </div>
                        <Switch
                          checked={settings.autoPrintReceipt}
                          onCheckedChange={(checked) => updateSetting('autoPrintReceipt', checked)}
                        />
                      </div>

                      {settings.autoPrintReceipt && (
                        <div className="space-y-2">
                          <Label>Printer Name (optional)</Label>
                          <Input
                            value={settings.printerName || ''}
                            onChange={(e) => updateSetting('printerName', e.target.value)}
                            placeholder="e.g., Thermal Receipt Printer"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BIR Compliance Section */}
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-[#FF6A00]" />
                      BIR Compliance (Philippine Tax Requirements)
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-xs text-blue-900">
                          <strong>Required for Philippine businesses:</strong> Fill in your BIR registration details 
                          to generate tax-compliant receipts per BIR regulations.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Registered Business Name</Label>
                        <Input
                          value={settings.businessName || ''}
                          onChange={(e) => updateSetting('businessName', e.target.value)}
                          placeholder="e.g., Juan's Electronics Store"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Business Address</Label>
                        <Textarea
                          value={settings.businessAddress || ''}
                          onChange={(e) => updateSetting('businessAddress', e.target.value)}
                          placeholder="Complete business address"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>TIN (Tax Identification Number)</Label>
                        <Input
                          value={settings.tin || ''}
                          onChange={(e) => updateSetting('tin', e.target.value)}
                          placeholder="XXX-XXX-XXX-XXX (12 digits + branch code)"
                          maxLength={18}
                        />
                        <p className="text-xs text-muted-foreground">
                          Format: 000-000-000-000
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>MIN (Machine ID Number)</Label>
                          <Input
                            value={settings.minNumber || ''}
                            onChange={(e) => updateSetting('minNumber', e.target.value)}
                            placeholder="MIN-XXXXXXXXXX"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Serial Number Range</Label>
                          <Input
                            value={settings.serialNumberRange || ''}
                            onChange={(e) => updateSetting('serialNumberRange', e.target.value)}
                            placeholder="00001-99999"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>BIR Permit Number</Label>
                          <Input
                            value={settings.permitNumber || ''}
                            onChange={(e) => updateSetting('permitNumber', e.target.value)}
                            placeholder="FP-XXXXXX"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Accreditation Number</Label>
                          <Input
                            value={settings.accreditationNumber || ''}
                            onChange={(e) => updateSetting('accreditationNumber', e.target.value)}
                            placeholder="ACCR-XXXXXX"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Accredited POS Provider</Label>
                        <Input
                          value={settings.accreditedProvider || 'BazaarPH POS System'}
                          onChange={(e) => updateSetting('accreditedProvider', e.target.value)}
                          placeholder="BazaarPH POS System"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Permit Validity Date</Label>
                        <Input
                          value={settings.validityDate || ''}
                          onChange={(e) => updateSetting('validityDate', e.target.value)}
                          placeholder="MM/DD/YYYY"
                          type="text"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Cash Drawer Settings */}
                <TabsContent value="cash" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#FF6A00]" />
                      Cash Drawer Management
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Cash Drawer</Label>
                          <p className="text-xs text-muted-foreground">Track cash drawer sessions</p>
                        </div>
                        <Switch
                          checked={settings.enableCashDrawer}
                          onCheckedChange={(checked) => updateSetting('enableCashDrawer', checked)}
                        />
                      </div>

                      {settings.enableCashDrawer && (
                        <div className="space-y-2">
                          <Label>Default Opening Cash (₱)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={settings.openingCash}
                            onChange={(e) => updateSetting('openingCash', parseFloat(e.target.value) || 0)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Suggested starting amount for new sessions
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Staff Settings */}
                <TabsContent value="staff" className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#FF6A00]" />
                      Staff Management
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Staff Tracking</Label>
                          <p className="text-xs text-muted-foreground">Track sales by staff member</p>
                        </div>
                        <Switch
                          checked={settings.enableStaffTracking}
                          onCheckedChange={(checked) => updateSetting('enableStaffTracking', checked)}
                        />
                      </div>

                      {settings.enableStaffTracking && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Label>Require Staff Login</Label>
                            <p className="text-xs text-muted-foreground">
                              Staff must login before making sales
                            </p>
                          </div>
                          <Switch
                            checked={settings.requireStaffLogin}
                            onCheckedChange={(checked) => updateSetting('requireStaffLogin', checked)}
                          />
                        </div>
                      )}

                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800">
                            <p className="font-medium">Staff Management</p>
                            <p className="text-xs mt-1">
                              To add or manage staff members, go to Seller Settings → Staff Management. 
                              Currently using demo staff for testing.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
