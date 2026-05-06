/**
 * Simple "Support" widget for a product request.
 * Shows a single button that lets a buyer signal "I want this too".
 * No pledge/stake/coin mechanics — just a one-click demand signal.
 */
import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { requestSupportService } from '@/services/requestSupportService';
import { useBuyerStore } from '@/stores/buyerStore';

interface SupportWidgetProps {
  requestId: string;
  demandCount: number;
  /** Kept for API compatibility with callers; not displayed. */
  stakedBazcoins?: number;
  onSupported?: () => void;
}

export function SupportWidget({ requestId, demandCount, onSupported }: SupportWidgetProps) {
  const { toast } = useToast();
  const profile = useBuyerStore((s) => s.profile);
  const [hasSupported, setHasSupported] = useState(false);
  const [count, setCount] = useState(demandCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCount(demandCount);
  }, [demandCount]);

  useEffect(() => {
    if (!profile?.id) return;
    requestSupportService.getUserSupportsForRequest(profile.id, requestId).then((rows) => {
      // Any prior support (upvote/pledge/stake) counts as "supported" for this UI.
      setHasSupported(rows.length > 0);
    });
  }, [profile?.id, requestId]);

  if (!profile) {
    return (
      <div className="rounded-xl border bg-white p-4 text-center text-sm text-gray-600">
        <a href="/login" className="text-orange-500 font-medium hover:underline">Sign in</a> to support this request
      </div>
    );
  }

  const handleSupport = async () => {
    if (hasSupported || busy) return;
    setBusy(true);
    const res = await requestSupportService.support(requestId, 'upvote', 0);
    setBusy(false);
    if (!res.success) {
      // If user already upvoted server-side, treat as supported.
      if (res.error && /already/i.test(res.error)) {
        setHasSupported(true);
        return;
      }
      toast({ title: 'Could not register support', description: res.error, variant: 'destructive' });
      return;
    }
    setHasSupported(true);
    setCount((c) => c + 1);
    toast({ title: 'Thanks for the support!', description: 'Your demand signal is in.' });
    onSupported?.();
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
      <div className="text-center">
        <p className="text-3xl font-bold text-gray-900">{count}</p>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{count === 1 ? 'Supporter' : 'Supporters'}</p>
      </div>
      <Button
        onClick={handleSupport}
        disabled={hasSupported || busy}
        className={
          hasSupported
            ? 'w-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 cursor-default'
            : 'w-full bg-orange-500 hover:bg-orange-600 text-white'
        }
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Heart className={`h-4 w-4 mr-2 ${hasSupported ? 'fill-green-600 text-green-600' : ''}`} />
            {hasSupported ? 'Supported' : 'Support this request'}
          </>
        )}
      </Button>
    </div>
  );
}
