import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';

type OrderStatus = 'all' | 'pending' | 'to-ship' | 'completed' | 'returns' | 'refunds';
type ChannelFilter = 'all' | 'online' | 'pos';

interface OrderCounts {
  all: number;
  pending: number;
  'to-ship': number;
  completed: number;
  returns: number;
  refunds: number;
}

interface ChannelCounts {
  all: number;
  online: number;
  pos: number;
}

interface OrderFiltersProps {
  selectedTab: OrderStatus;
  onTabChange: (tab: OrderStatus) => void;
  channelFilter: ChannelFilter;
  onChannelChange: (channel: ChannelFilter) => void;
  orderCounts: OrderCounts;
  channelCounts: ChannelCounts;
}

export default function OrderFilters({
  selectedTab,
  onTabChange,
  channelFilter,
  onChannelChange,
  orderCounts,
  channelCounts,
}: OrderFiltersProps) {
  const statusTabs: OrderStatus[] = ['all', 'pending', 'to-ship', 'completed', 'returns', 'refunds'];

  return (
    <>
      {/* Status Tabs */}
      <View style={styles.segmentedControlRow}>
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentedScrollContent}
          >
            {statusTabs.map((tab) => (
              <Pressable
                key={tab}
                style={[
                  styles.segmentButton,
                  selectedTab === tab && styles.segmentButtonActive,
                ]}
                onPress={() => onTabChange(tab)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    selectedTab === tab && styles.segmentButtonTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    selectedTab === tab && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      selectedTab === tab && styles.countBadgeTextActive,
                    ]}
                  >
                    {orderCounts[tab]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Channel Filter Tabs */}
      <View style={styles.channelFilterRow}>
        <Pressable
          style={[styles.channelTab, channelFilter === 'all' && styles.channelTabActive]}
          onPress={() => onChannelChange('all')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'all' && styles.channelTabTextActive]}>
            All Channels
          </Text>
          <View style={[styles.channelBadge, channelFilter === 'all' && styles.channelBadgeActive]}>
            <Text style={[styles.channelBadgeText, channelFilter === 'all' && styles.channelBadgeTextActive]}>
              {channelCounts.all}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.channelTab, channelFilter === 'online' && styles.channelTabActive]}
          onPress={() => onChannelChange('online')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'online' && styles.channelTabTextActive]}>
            Online App
          </Text>
          <View style={[styles.channelBadge, channelFilter === 'online' && styles.channelBadgeActive]}>
            <Text style={[styles.channelBadgeText, channelFilter === 'online' && styles.channelBadgeTextActive]}>
              {channelCounts.online}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.channelTab, channelFilter === 'pos' && styles.channelTabActive]}
          onPress={() => onChannelChange('pos')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'pos' && styles.channelTabTextActive]}>
            POS / Offline
          </Text>
          <View style={[styles.channelBadge, channelFilter === 'pos' && styles.channelBadgeActive]}>
            <Text style={[styles.channelBadgeText, channelFilter === 'pos' && styles.channelBadgeTextActive]}>
              {channelCounts.pos}
            </Text>
          </View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  segmentedControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 3,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  segmentedScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  segmentButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#FF5722',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
  channelFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  channelTabActive: {
    backgroundColor: '#FF5722',
  },
  channelTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  channelTabTextActive: {
    color: '#FFFFFF',
  },
  channelBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  channelBadgeTextActive: {
    color: '#FFFFFF',
  },
});
