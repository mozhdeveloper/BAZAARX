import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Gift, Star } from 'lucide-react';
import type { BuyerProfile } from '@/stores/buyerStore';

interface ProfileSummarySectionProps {
  profile: BuyerProfile;
}

export const ProfileSummarySection = ({ profile }: ProfileSummarySectionProps) => {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Shopping Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-between items-end pb-4 border-b border-[var(--border)]">
            <div>
              <div className="text-sm text-[var(--text-muted)] mb-1">Lifetime Spend</div>
              <div className="text-2xl font-bold text-gray-900">₱{(profile.totalSpent || 0).toLocaleString()}</div>
            </div>
            <div className="w-10 h-10 flex items-center justify-center text-[var(--brand-primary-dark)]">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="flex justify-between items-end pb-4 border-b border-[var(--border)]">
            <div>
              <div className="text-sm text-[var(--text-muted)] mb-1">Bazcoins Balance</div>
              <div className="text-2xl font-bold text-[var(--brand-accent)]">{profile.bazcoins || 0}</div>
            </div>
            <div className="w-10 h-10 flex items-center justify-center text-[var(--brand-accent)]">
              <Gift className="w-5 h-5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};