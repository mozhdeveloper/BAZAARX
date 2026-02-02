import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';

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

interface OrderFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTab: OrderStatus;
  onTabChange: (tab: OrderStatus) => void;
  channelFilter: ChannelFilter;
  onChannelChange: (channel: ChannelFilter) => void;
  orderCounts: OrderCounts;
  channelCounts: ChannelCounts;
}

export default function OrderFilterModal({
  visible,
  onClose,
  selectedTab,
  onTabChange,
  channelFilter,
  onChannelChange,
  orderCounts,
  channelCounts,
}: OrderFilterModalProps) {

  const statusOptions: { label: string; value: OrderStatus }[] = [
    { label: 'All Orders', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'To Ship', value: 'to-ship' },
    { label: 'Completed', value: 'completed' },
    { label: 'Returns', value: 'returns' },
    { label: 'Refunds', value: 'refunds' },
  ];

  const channelOptions: { label: string; value: ChannelFilter }[] = [
    { label: 'All Channels', value: 'all' },
    { label: 'Online App', value: 'online' },
    { label: 'POS / Offline', value: 'pos' },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Orders</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Status Section */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Order Status</Text>
              <View style={styles.optionsGrid}>
                {statusOptions.map((option) => {
                  const isSelected = selectedTab === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionChip,
                        isSelected && styles.optionChipSelected
                      ]}
                      onPress={() => onTabChange(option.value)}
                    >
                      <Text
                        style={[
                           styles.optionText,
                           isSelected && styles.optionTextSelected
                        ]}
                      >
                        {option.label}
                      </Text>
                      <View style={[
                        styles.countBadge,
                        isSelected && styles.countBadgeSelected
                      ]}>
                        <Text style={[
                          styles.countText,
                          isSelected && styles.countTextSelected
                        ]}>
                          {orderCounts[option.value]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Channel Section */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Sales Channel</Text>
              <View style={styles.optionsGrid}>
                {channelOptions.map((option) => {
                  const isSelected = channelFilter === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionChip,
                        isSelected && styles.optionChipSelected
                      ]}
                      onPress={() => onChannelChange(option.value)}
                    >
                       <Text
                        style={[
                           styles.optionText,
                           isSelected && styles.optionTextSelected
                        ]}
                      >
                        {option.label}
                      </Text>
                       <View style={[
                        styles.countBadge,
                        isSelected && styles.countBadgeSelected
                      ]}>
                        <Text style={[
                          styles.countText,
                          isSelected && styles.countTextSelected
                        ]}>
                          {channelCounts[option.value]}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
             <TouchableOpacity style={styles.applyButton} onPress={onClose}>
               <Text style={styles.applyButtonText}>Apply Filters</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  modalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  optionsGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 10,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  optionChipSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF5722',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  optionTextSelected: {
    color: '#FF5722',
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeSelected: {
    backgroundColor: '#FF5722',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  countTextSelected: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  applyButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  }
});
