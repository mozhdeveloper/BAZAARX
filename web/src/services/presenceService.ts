import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Define the type locally so we don't get missing type errors
export interface UserPresence {
  user_id: string;
  user_type: string;
  seller_id?: string | null;
  is_online: boolean;
  last_active_at: string;
  connected_at: string;
}

class PresenceService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private presenceCache: Map<string, UserPresence> = new Map();

  async updatePresence(
    userId: string,
    userType: 'buyer' | 'seller',
    sellerId?: string
  ): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .upsert(
          {
            user_id: userId,
            user_type: userType,
            seller_id: sellerId || null,
            is_online: true,
            last_active_at: new Date().toISOString(),
            connected_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,user_type', // The conflict rule we fixed earlier!
          }
        )
        .select()
        .single();

      if (error) {
        console.error('[PresenceService] Error updating presence:', error);
        return null;
      }

      if (data) {
        this.presenceCache.set(userId, data as UserPresence);
      }

      return (data as UserPresence) || null;
    } catch (e) {
      console.error('[PresenceService] Exception updating presence:', e);
      return null;
    }
  }

  async setOffline(
    userId: string,
    userType: 'buyer' | 'seller'
  ): Promise<void> {
    try {
      // CRITICAL FIX: Always delete from cache FIRST to ensure immediate UI updates
      this.presenceCache.delete(userId);

      await supabase
        .from('user_presence')
        .update({
          is_online: false,
          last_active_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('user_type', userType);
    } catch (e) {
      console.error('[PresenceService] Error setting offline:', e);
    }
  }

  startHeartbeat(
    userId: string,
    userType: 'buyer' | 'seller',
    sellerId?: string,
    intervalSeconds: number = 30
  ): void {
    const heartbeatKey = `${userId}:${userType}`;

    if (this.heartbeatIntervals.has(heartbeatKey)) {
      const existingInterval = this.heartbeatIntervals.get(heartbeatKey);
      if (existingInterval) {
        clearInterval(existingInterval);
      }
    }

    this.updatePresence(userId, userType, sellerId).catch((e) => {
      console.error('[PresenceService] Error in initial presence update:', e);
    });

    const interval = setInterval(() => {
      this.updatePresence(userId, userType, sellerId).catch((e) => {
        console.error('[PresenceService] Error in heartbeat presence update:', e);
      });
    }, intervalSeconds * 1000);

    this.heartbeatIntervals.set(heartbeatKey, interval);
  }

  stopHeartbeat(userId: string, userType: 'buyer' | 'seller'): void {
    const heartbeatKey = `${userId}:${userType}`;
    const interval = this.heartbeatIntervals.get(heartbeatKey);

    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(heartbeatKey);
    }

    // CRITICAL FIX: Immediately clear the cache to prevent stale presence in subscriptions
    this.presenceCache.delete(userId);

    // CRITICAL FIX: Ensure offline update completes without breaking flow
    this.setOffline(userId, userType).catch((e) => {
      console.error('[PresenceService] Error during stopHeartbeat:', e);
    });
  }

  async getSellerPresence(sellerId: string): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', sellerId)
        .eq('user_type', 'seller')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[PresenceService] Error fetching seller presence:', error);
        return null;
      }

      return (data as UserPresence) || null;
    } catch (e) {
      console.error('[PresenceService] Exception fetching seller presence:', e);
      return null;
    }
  }

  async getSellerPresenceForConversation(
    conversationId: string
  ): Promise<{ sellerId: string | null; isOnline: boolean; lastActiveAt: string | null } | null> {
    try {
      const { data, error } = await supabase.rpc('get_seller_presence', {
        conv_id: conversationId,
      });

      if (error) {
        console.error('[PresenceService] Error getting seller presence for conversation:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const presence = data[0];
      return {
        sellerId: presence.seller_id,
        isOnline: presence.is_online || false,
        lastActiveAt: presence.last_active_at,
      };
    } catch (e) {
      console.error('[PresenceService] Exception getting seller presence for conversation:', e);
      return null;
    }
  }

  subscribeToSellerPresence(
    sellerId: string,
    onUpdate: (presence: UserPresence | null) => void
  ): () => void {
    return this.subscribeToPresence(sellerId, onUpdate);
  }

  subscribeToPresence(
    userId: string,
    onUpdate: (presence: UserPresence | null) => void
  ): () => void {
    const channelName = `presence:${userId}`;

    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const presence = payload.new as UserPresence;
            this.presenceCache.set(userId, presence);
            onUpdate(presence);
          } else if (payload.eventType === 'DELETE') {
            this.presenceCache.delete(userId);
            onUpdate(null);
          }
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  getPresenceFromCache(userId: string): UserPresence | null {
    return this.presenceCache.get(userId) || null;
  }

  async cleanupStalePresence(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_stale_presence');

      if (error) {
        console.error('[PresenceService] Error cleaning up stale presence:', error);
      }
    } catch (e) {
      console.error('[PresenceService] Exception cleaning up stale presence:', e);
    }
  }

  private unsubscribe(channelName: string): void {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  cleanup(): void {
    this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
    this.heartbeatIntervals.clear();
    this.subscriptions.forEach((_channel, channelName) => this.unsubscribe(channelName));
    this.subscriptions.clear();
    this.presenceCache.clear();
  }
}

export const presenceService = new PresenceService();