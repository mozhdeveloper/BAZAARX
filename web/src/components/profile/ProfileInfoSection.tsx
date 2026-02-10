import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import type { BuyerProfile } from '@/stores/buyerStore';

interface ProfileInfoSectionProps {
  profile: BuyerProfile;
  // onEdit: () => void; // Not currently used
}

export const ProfileInfoSection = ({ profile }: ProfileInfoSectionProps) => {
  return (
    <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-[#ff6a00]" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email Address</div>
            <div className="text-gray-900 font-medium">{profile.email}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone Number</div>
            <div className="text-gray-900 font-medium">{profile.phone}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Member Since</div>
            <div className="text-gray-900 font-medium">
              {profile.memberSince ? new Date(profile.memberSince).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};