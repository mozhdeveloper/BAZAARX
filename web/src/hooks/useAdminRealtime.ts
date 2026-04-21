import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Subscribe to Supabase realtime INSERT/UPDATE/DELETE events on a table and
 * invoke `onChange` (debounced) to reload data.
 *
 * Safe no-op when Supabase isn't configured.
 *
 * @param table   Table name (e.g. 'orders').
 * @param onChange Called when any change is observed (debounced ~300ms).
 * @param options.channelName Optional unique channel name (defaults to `admin-realtime-${table}`).
 * @param options.filter Optional Postgres CDC filter (e.g. "status=eq.pending").
 * @param options.enabled Disable subscription (default true).
 */
export function useAdminRealtime(
  table: string,
  onChange: () => void,
  options?: {
    channelName?: string;
    filter?: string;
    enabled?: boolean;
  },
) {
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  const enabled = options?.enabled ?? true;
  const channelName = options?.channelName ?? `admin-realtime-${table}`;
  const filter = options?.filter;

  useEffect(() => {
    if (!enabled) return;
    if (!isSupabaseConfigured()) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedHandler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          handlerRef.current();
        } catch (err) {
          console.warn(`[useAdminRealtime:${table}] onChange threw:`, err);
        }
      }, 300);
    };

    const channel = supabase.channel(channelName);
    const config: any = { event: '*', schema: 'public', table };
    if (filter) config.filter = filter;

    channel
      .on('postgres_changes', config, debouncedHandler)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[useAdminRealtime:${table}] subscribe status: ${status}`);
        }
      });

    return () => {
      if (timer) clearTimeout(timer);
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn(`[useAdminRealtime:${table}] removeChannel failed:`, err);
      }
    };
  }, [enabled, channelName, table, filter]);
}
