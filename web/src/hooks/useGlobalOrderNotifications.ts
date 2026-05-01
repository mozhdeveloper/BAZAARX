/**
 * useGlobalOrderNotifications
 *
 * Mounts a single Supabase Realtime subscription for the current user
 * (buyer OR seller) and shows an in-app toast banner whenever a new
 * notification row is inserted into buyer_notifications or
 * seller_notifications.
 *
 * Handles ALL notification types including:
 *   - order_* (order status changes)
 *   - new_message (incoming chat messages)
 *   - any future type
 *
 * Mount this hook ONCE at the App root so it is always active regardless
 * of which page the user is on.
 */
import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useBuyerStore } from '@/stores/buyerStore';
import { useAuthStore } from '@/stores/seller/sellerAuthStore';

function toastVariant(type: string): 'default' | 'destructive' {
  if (type === 'order_cancelled' || type === 'order_failed_to_deliver') return 'destructive';
  return 'default';
}

/** Duration in ms — messages get a shorter toast so they don't block UI */
function toastDuration(type: string): number {
  return type === 'new_message' ? 4000 : 6000;
}

export function useGlobalOrderNotifications() {
  const buyerProfile = useBuyerStore((s) => s.profile);
  const { seller } = useAuthStore();

  // Keep stable refs so the effect doesn't re-subscribe on every render
  const buyerIdRef = useRef<string | null>(null);
  const sellerIdRef = useRef<string | null>(null);

  buyerIdRef.current = buyerProfile?.id ?? null;
  sellerIdRef.current = seller?.id ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const buyerId = buyerIdRef.current;
    const sellerId = sellerIdRef.current;

    if (!buyerId && !sellerId) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // ── Buyer notifications ─────────────────────────────────────────────
    if (buyerId) {
      const ch = supabase
        .channel(`buyer_notifications_toast_${buyerId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'buyer_notifications',
            filter: `buyer_id=eq.${buyerId}`,
          },
          (payload) => {
            const n = payload.new as {
              type: string;
              title: string;
              message: string;
              action_url?: string;
            };
            toast({
              title: n.title,
              description: n.message,
              variant: toastVariant(n.type),
              duration: toastDuration(n.type),
            });
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[GlobalNotifications] buyer channel error');
          }
        });
      channels.push(ch);
    }

    // ── Seller notifications ────────────────────────────────────────────
    if (sellerId) {
      const ch = supabase
        .channel(`seller_notifications_toast_${sellerId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'seller_notifications',
            filter: `seller_id=eq.${sellerId}`,
          },
          (payload) => {
            const n = payload.new as {
              type: string;
              title: string;
              message: string;
            };
            toast({
              title: n.title,
              description: n.message,
              variant: toastVariant(n.type),
              duration: toastDuration(n.type),
            });
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[GlobalNotifications] seller channel error');
          }
        });
      channels.push(ch);
    }

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch { /* ignore */ }
      });
    };
  }, [buyerProfile?.id, seller?.id]);
}
