import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Clock,
  CheckCircle,
  CreditCard,
} from 'lucide-react-native';

interface OrderStats {
  total: number;
  pending: number;
  delivered: number;
  posToday: number;
}

interface OrderStatsBarProps {
  stats: OrderStats;
}

export default function OrderStatsBar({ stats }: OrderStatsBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable 
      style={[styles.bottomStatsContainer, { paddingBottom: 12 }]} 
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.bottomStatsHeader}>
        <View style={styles.bottomStatsSummary}>
          <Text style={styles.bottomStatsTitle}>Orders Summary</Text>
          <View style={styles.bottomStatsRow}>
            <Text style={styles.bottomStatsText}>
              Total: <Text style={styles.bottomStatsValue}>{stats.total}</Text>
            </Text>
            <View style={styles.bottomStatsDot} />
            <Text style={styles.bottomStatsText}>
              Pending: <Text style={[styles.bottomStatsValue, { color: '#D97706' }]}>{stats.pending}</Text>
            </Text>
          </View>
        </View>
        <View style={styles.chevronContainer}>
          {expanded ? (
            <ChevronDown size={20} color="#6B7280" />
          ) : (
            <ChevronUp size={20} color="#6B7280" />
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedStats}>
          {/* Row 1: Total */}
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} color="#6B7280" />
              <Text style={styles.statRowLabel}>Total Orders</Text>
            </View>
            <Text style={styles.statRowValue}>{stats.total}</Text>
          </View>

          {/* Row 2: Pending */}
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#CA8A04" />
              <Text style={styles.statRowLabel}>Pending</Text>
            </View>
            <Text style={[styles.statRowValue, { color: '#CA8A04' }]}>{stats.pending}</Text>
          </View>

          {/* Row 3: Delivered */}
          <View style={styles.statRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} color="#16A34A" />
              <Text style={styles.statRowLabel}>Delivered</Text>
            </View>
            <Text style={[styles.statRowValue, { color: '#16A34A' }]}>{stats.delivered}</Text>
          </View>

          {/* Row 4: POS */}
          <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CreditCard size={16} color="#9333EA" />
              <Text style={styles.statRowLabel}>POS Today</Text>
            </View>
            <Text style={[styles.statRowValue, { color: '#9333EA' }]}>{stats.posToday}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomStatsSummary: {
    flex: 1,
  },
  bottomStatsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomStatsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  bottomStatsValue: {
    fontWeight: '700',
    color: '#1F2937',
  },
  bottomStatsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  chevronContainer: {
    padding: 4,
  },
  expandedStats: {
    paddingTop: 12,
    gap: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statRowLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});
