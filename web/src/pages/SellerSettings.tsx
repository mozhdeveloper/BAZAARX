import { useState } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  TrendingUp,
  User,
  Store,
  Bell,
  Lock,
  CreditCard,
  Save,
  Camera,
  Smartphone,
  Facebook,
  Instagram,
  Twitter,
  Star,
  Wallet
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/sellerStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SellerSettings() {
  const { seller } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'notifications' | 'security' | 'payment'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "/seller",
      icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Store Profile",
      href: "/seller/store-profile",
      icon: <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Products",
      href: "/seller/products",
      icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Orders",
      href: "/seller/orders", 
      icon: <ShoppingCart className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Earnings",
      href: "/seller/earnings",
      icon: <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Reviews",
      href: "/seller/reviews",
      icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Analytics",
      href: "/seller/analytics",
      icon: <TrendingUp className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Settings",
      href: "/seller/settings",
      icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    }
  ];

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
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
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
          </div>
        </SidebarBody>
      </Sidebar>
      <SettingsContent activeTab={activeTab} setActiveTab={setActiveTab} handleSave={handleSave} isSaving={isSaving} />
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

interface SettingsContentProps {
  activeTab: 'profile' | 'store' | 'notifications' | 'security' | 'payment';
  setActiveTab: (tab: 'profile' | 'store' | 'notifications' | 'security' | 'payment') => void;
  handleSave: () => void;
  isSaving: boolean;
}

const SettingsContent = ({ activeTab, setActiveTab, handleSave, isSaving }: SettingsContentProps) => {
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'store', label: 'Store Info', icon: <Store className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="h-4 w-4" /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-1 w-full">
      <div className="p-2 md:p-8 bg-gray-50 flex flex-col gap-6 flex-1 w-full h-full overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and store preferences</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'store' | 'notifications' | 'security' | 'payment')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.icon}
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'store' && <StoreSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'payment' && <PaymentSettings />}
        </motion.div>
      </div>
    </div>
  );
};

const ProfileSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <p className="text-sm text-gray-600 mb-6">Update your personal details and profile picture</p>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-3xl font-medium">JD</span>
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <Camera className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">Profile Picture</h4>
          <p className="text-sm text-gray-600 mt-1">JPG, PNG or GIF. Max size 2MB</p>
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
    </div>
  );
};

const StoreSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Information</h3>
        <p className="text-sm text-gray-600 mb-6">Manage your store details and public information</p>
      </div>

      <div className="space-y-6">
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

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Social Media Links</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Facebook className="h-5 w-5 text-blue-600" />
              <Input placeholder="Facebook page URL" defaultValue="https://facebook.com/mystore" />
            </div>
            <div className="flex items-center gap-3">
              <Instagram className="h-5 w-5 text-pink-600" />
              <Input placeholder="Instagram profile URL" defaultValue="https://instagram.com/mystore" />
            </div>
            <div className="flex items-center gap-3">
              <Twitter className="h-5 w-5 text-blue-400" />
              <Input placeholder="Twitter profile URL" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    orderNotifications: true,
    productAlerts: true,
    promotionalEmails: false,
    weeklyReport: true,
    reviewNotifications: true,
    inventoryAlerts: true
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notifications = [
    { key: 'orderNotifications', label: 'Order Notifications', desc: 'Get notified when you receive new orders' },
    { key: 'productAlerts', label: 'Product Alerts', desc: 'Alerts about product performance and issues' },
    { key: 'promotionalEmails', label: 'Promotional Emails', desc: 'Receive marketing and promotional content' },
    { key: 'weeklyReport', label: 'Weekly Report', desc: 'Get weekly summaries of your store performance' },
    { key: 'reviewNotifications', label: 'Review Notifications', desc: 'Get notified of new product reviews' },
    { key: 'inventoryAlerts', label: 'Inventory Alerts', desc: 'Low stock and out-of-stock notifications' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        <p className="text-sm text-gray-600 mb-6">Manage how you receive notifications and updates</p>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{notification.label}</h4>
              <p className="text-sm text-gray-600 mt-1">{notification.desc}</p>
            </div>
            <button
              onClick={() => toggleSetting(notification.key as keyof typeof settings)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings[notification.key as keyof typeof settings] ? 'bg-orange-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[notification.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SecuritySettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        <p className="text-sm text-gray-600 mb-6">Manage your password and account security</p>
      </div>

      <div className="space-y-6">
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

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Two-Factor Authentication</h4>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable 2FA</p>
              <p className="text-sm text-gray-600 mt-1">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
              Enable
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h3>
        <p className="text-sm text-gray-600 mb-6">Manage your payment methods and payout preferences</p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Bank Account</h4>
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

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">E-Wallet</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <Label htmlFor="gcash">GCash Number</Label>
                <Input id="gcash" placeholder="09XX XXX XXXX" defaultValue="0912 345 6789" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Payout Schedule</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="radio" name="payout" defaultChecked className="text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Weekly</p>
                <p className="text-sm text-gray-600">Every Monday</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="radio" name="payout" className="text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Bi-weekly</p>
                <p className="text-sm text-gray-600">Every 1st and 15th</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="radio" name="payout" className="text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Monthly</p>
                <p className="text-sm text-gray-600">Every 1st of the month</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
