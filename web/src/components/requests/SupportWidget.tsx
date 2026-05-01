/**
 * Stake / Pledge / Upvote widget for a product request.
 * BX-07-006, BX-07-007, BX-07-008.
 */
import { useEffect, useState } from 'react';
import { Coins, ThumbsUp, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { requestSupportService } from '@/services/requestSupportService';
import { bazcoinService } from '@/services/bazcoinService';
import { useBuyerStore } from '@/stores/buyerStore';

interface SupportWidgetProps {
  requestId: string;
  demandCount: number;
  stakedBazcoins: number;
  onSupported?: () => void;
}

export function SupportWidget({ requestId, demandCount, stakedBazcoins, onSupported }: SupportWidgetProps) {
  const { toast } = useToast();
  const profile = useBuyerStore((s) => s.profile);
  const updateProfile = useBuyerStore((s) => s.updateProfile);
  const [busy, setBusy] = useState<string | null>(null);
  const [stakeAmt, setStakeAmt] = useState<number>(10);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasPledged, setHasPledged] = useState(false);
  const [userStaked, setUserStaked] = useState(0);
  const [balance, setBalance] = useState(profile?.bazcoins ?? 0);

  useEffect(() => {
    if (!profile?.id) return;
    requestSupportService.getUserSupportsForRequest(profile.id, requestId).then((rows) => {
      setHasUpvoted(rows.some((r) => r.supportType === 'upvote'));
      setHasPledged(rows.some((r) => r.supportType === 'pledge'));
      setUserStaked(rows.filter((r) => r.supportType === 'stake').reduce((s, r) => s + r.bazcoinAmount, 0));
    });
    bazcoinService.getBalance(profile.id).then(setBalance);
  }, [profile?.id, requestId]);

  if (!profile) {
    return (
      <div className="rounded-lg border bg-white p-4 text-center text-sm text-gray-600">
        <a href="/login" className="text-brand-primary font-medium hover:underline">Sign in</a> to support this request
      </div>
    );
  }

  const support = async (type: 'upvote' | 'pledge' | 'stake', amount = 0) => {
    setBusy(type);
    const res = await requestSupportService.support(requestId, type, amount);
    setBusy(null);
    if (!res.success) {
      toast({ title: 'Could not register support', description: res.error, variant: 'destructive' });
      return;
    }
    toast({
      title: type === 'stake' ? `Staked ${amount} BC` : type === 'pledge' ? 'Pledged' : 'Upvoted',
      description: type === 'stake' ? 'Thanks for backing this request!' : 'Your demand signal is in.',
    });
    if (typeof res.newBalance === 'number') {
      setBalance(res.newBalance);
      updateProfile({ bazcoins: res.newBalance });
    }
    if (type === 'upvote')  setHasUpvoted(true);
    if (type === 'pledge')  setHasPledged(true);
    if (type === 'stake')   setUserStaked((p) => p + amount);
    onSupported?.();
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-2xl font-bold text-gray-900">{demandCount}</p>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Supporters</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-2xl font-bold text-amber-700">{stakedBazcoins.toLocaleString()}</p>
          <p className="text-xs text-amber-600 uppercase tracking-wide">BC staked</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={hasUpvoted ? 'secondary' : 'outline'}
          disabled={hasUpvoted || busy === 'upvote'}
          onClick={() => support('upvote')}
          className="w-full"
        >
          {busy === 'upvote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-1" />}
          {hasUpvoted ? 'Upvoted' : 'Upvote'}
        </Button>
        <Button
          variant={hasPledged ? 'secondary' : 'outline'}
          disabled={hasPledged || busy === 'pledge'}
          onClick={() => support('pledge')}
          className="w-full"
        >
          {busy === 'pledge' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4 mr-1" />}
          {hasPledged ? 'Pledged' : 'Pledge'}
        </Button>
      </div>

      <div className="rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-amber-900 flex items-center gap-1">
            <Coins className="h-4 w-4" /> Stake BazCoins
          </span>
          <span className="text-xs text-amber-700">Balance: {balance.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={balance}
            value={stakeAmt}
            onChange={(e) => setStakeAmt(Math.max(1, Number(e.target.value) || 1))}
            className="text-sm"
          />
          <Button
            disabled={busy === 'stake' || stakeAmt < 1 || stakeAmt > balance}
            onClick={() => support('stake', stakeAmt)}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {busy === 'stake' ? <Loader2 className="h-4 w-4 animate-spin" /> : `Stake ${stakeAmt}`}
          </Button>
        </div>
        {userStaked > 0 && (
          <p className="text-xs text-amber-800 mt-2">You've staked <strong>{userStaked} BC</strong> on this request</p>
        )}
      </div>
    </div>
  );
}
