import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Calendar, Edit2, Check, X } from 'lucide-react';
import type { BuyerProfile } from '@/stores/buyerStore';
import { useBuyerStore } from '@/stores/buyerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProfileInfoSectionProps {
  profile: BuyerProfile;
}

export const ProfileInfoSection = ({ profile }: ProfileInfoSectionProps) => {
  const updateProfile = useBuyerStore((state) => state.updateProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
  });

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
    });
    setIsEditing(false);
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-bold">My Profile</CardTitle>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-[var(--brand-accent)] hover:text-[var(--brand-primary-dark)] hover:bg-base"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-500 hover:text-red-700 hover:bg-base"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="bg-[var(--brand-accent)] hover:bg-[var(--brand-primary)] text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name Field */}
        <div className="flex items-center gap-4 p-3 border-b border-[var(--border)]">
          <div className="w-10 h-10 flex items-center justify-center text-orange-600 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--text-muted)] mb-1">Name</div>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First Name"
                  className="bg-white border-gray-200"
                />
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last Name"
                  className="bg-white border-gray-200"
                />
              </div>
            ) : (
              <div className="text-gray-900 font-medium truncate">{profile.firstName} {profile.lastName}</div>
            )}
          </div>
        </div>

        {/* Email Field - Read Only */}
        <div className="flex items-center gap-4 p-3 pt-1 border-b border-[var(--border)]">
          <div className="w-10 h-10 flex items-center justify-center text-orange-600 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--text-muted)] mb-1">Email Address</div>
            <div className="text-gray-900 font-medium truncate">{profile.email}</div>
          </div>
        </div>

        {/* Phone Field */}
        <div className="flex items-center gap-4 p-3 pt-1 border-b border-[var(--border)]">
          <div className="w-10 h-10 flex items-center justify-center text-orange-600 shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--text-muted)] mb-1">Phone Number</div>
            {isEditing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone Number"
                className="bg-white border-gray-200"
              />
            ) : (
              <div className="text-gray-900 font-medium truncate">{profile.phone || 'Not set'}</div>
            )}
          </div>
        </div>

        {/* Member Since Field - Read Only */}
        <div className="flex items-center gap-4 p-3 pt-1">
          <div className="w-10 h-10 flex items-center justify-center text-orange-600 shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--text-muted)] mb-1">Member Since</div>
            <div className="text-gray-900 font-medium">
              {profile.memberSince ? new Date(profile.memberSince).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};