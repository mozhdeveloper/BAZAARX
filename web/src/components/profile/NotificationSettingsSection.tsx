import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';
import type { BuyerProfile } from '@/stores/buyerStore';

interface NotificationSettingsSectionProps {
  profile: BuyerProfile;
  onUpdatePreferences: (preferences: BuyerProfile['preferences']) => void;
}

export const NotificationSettingsSection = ({ 
  profile, 
  onUpdatePreferences 
}: NotificationSettingsSectionProps) => {
  const handleNotificationToggle = (type: string, enabled: boolean) => {
    const newPreferences = {
      ...profile.preferences,
      notifications: {
        ...profile.preferences.notifications,
        [type]: enabled
      }
    };
    onUpdatePreferences(newPreferences);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#ff6a00]" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-gray-500">Receive order updates via email</div>
            </div>
            <Switch 
              checked={profile.preferences.notifications.email} 
              onCheckedChange={(checked) => handleNotificationToggle('email', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">SMS Notifications</div>
              <div className="text-sm text-gray-500">Receive important updates via SMS</div>
            </div>
            <Switch 
              checked={profile.preferences.notifications.sms} 
              onCheckedChange={(checked) => handleNotificationToggle('sms', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Push Notifications</div>
              <div className="text-sm text-gray-500">Receive push notifications on mobile</div>
            </div>
            <Switch 
              checked={profile.preferences.notifications.push} 
              onCheckedChange={(checked) => handleNotificationToggle('push', checked)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#ff6a00]" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Profile Visibility</div>
              <div className="text-sm text-gray-500">Make your profile visible to other users</div>
            </div>
            <Switch 
              checked={profile.preferences.privacy.showProfile} 
              onCheckedChange={(checked) => {
                const newPreferences = {
                  ...profile.preferences,
                  privacy: {
                    ...profile.preferences.privacy,
                    showProfile: checked
                  }
                };
                onUpdatePreferences(newPreferences);
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Order History Visibility</div>
              <div className="text-sm text-gray-500">Allow sellers to see your purchase history</div>
            </div>
            <Switch 
              checked={profile.preferences.privacy.showPurchases} 
              onCheckedChange={(checked) => {
                const newPreferences = {
                  ...profile.preferences,
                  privacy: {
                    ...profile.preferences.privacy,
                    showPurchases: checked
                  }
                };
                onUpdatePreferences(newPreferences);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};