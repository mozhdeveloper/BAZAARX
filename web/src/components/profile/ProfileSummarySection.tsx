import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Gift, Star } from 'lucide-react';
import type { BuyerProfile } from '@/stores/buyerStore';

interface ProfileSummarySectionProps {
  profile: BuyerProfile;
}

export const ProfileSummarySection = ({ profile }: ProfileSummarySectionProps) => {
  return (
    <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingBag className="h-5 w-5 text-[#ff6a00]" />
          Shopping Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-between items-end pb-4 border-b border-gray-100">
            <div>
              <div className="text-sm text-gray-500 mb-1">Lifetime Spend</div>
              <div className="text-2xl font-bold text-gray-900">₱{(profile.totalSpent || 0).toLocaleString()}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="flex justify-between items-end pb-4 border-b border-gray-100">
            <div>
              <div className="text-sm text-gray-500 mb-1">Bazcoins Balance</div>
              <div className="text-2xl font-bold text-yellow-600">{profile.bazcoins || 0}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
              <Gift className="w-5 h-5" />
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-sm text-gray-500 mb-1">Buyer Rating</div>
              <div className="flex items-center gap-1 text-2xl font-bold text-gray-900">
                4.8 <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Star className="w-5 h-5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};