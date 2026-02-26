// EARNINGS PAGE - Matches web exactly with same data and functionality
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, DollarSign, TrendingUp, Calendar, Clock, Download, CheckCircle, AlertCircle } from 'lucide-react-native';

export default function EarningsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();

  // Demo data - matches web exactly
  const payoutHistory = [
    { id: 1, date: '2024-01-15', amount: 25840.50, status: 'completed', method: 'Bank Transfer', reference: 'PYT-2024-001' },
    { id: 2, date: '2024-01-08', amount: 18920.00, status: 'completed', method: 'Bank Transfer', reference: 'PYT-2024-002' },
    { id: 3, date: '2024-01-01', amount: 32150.75, status: 'completed', method: 'Bank Transfer', reference: 'PYT-2024-003' },
  ];

  const totalEarnings = 76911.25;
  const pendingPayout = 15240.50;
  const availableBalance = totalEarnings - pendingPayout;
  const lastPayout = payoutHistory.find(p => p.status === 'completed');

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Earnings Dashboard</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Earnings Cards */}
        <View style={styles.cardsGrid}>
          <View style={styles.totalCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconOrange}><DollarSign size={24} color="#FFF" strokeWidth={2} /></View>
              <View style={styles.growthBadge}><TrendingUp size={14} color="#FFF" /><Text style={styles.growthText}>+12.5%</Text></View>
            </View>
            <Text style={styles.cardLabel}>Total Earnings</Text>
            <Text style={styles.cardValueWhite}>₱{totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtext}>Lifetime earnings from sales</Text>
          </View>

          <View style={styles.availableCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconGreen}><Wallet size={24} color="#10B981" strokeWidth={2} /></View>
              <CheckCircle size={20} color="#10B981" />
            </View>
            <Text style={styles.cardLabelGray}>Available Balance</Text>
            <Text style={styles.cardValueDark}>₱{availableBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtextGray}>Ready for payout</Text>
          </View>

          <View style={styles.pendingCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconYellow}><Clock size={24} color="#F59E0B" strokeWidth={2} /></View>
              <AlertCircle size={20} color="#F59E0B" />
            </View>
            <Text style={styles.cardLabelGray}>Pending Payout</Text>
            <Text style={styles.cardValueDark}>₱{pendingPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtextGray}>Processing orders</Text>
          </View>

          {/* Last Payout Card */}
          {lastPayout && (
            <View style={[styles.availableCard, { borderLeftColor: '#3B82F6', borderLeftWidth: 3 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconGreen, { backgroundColor: '#EFF6FF' }]}><Calendar size={24} color="#3B82F6" strokeWidth={2} /></View>
                <CheckCircle size={20} color="#3B82F6" />
              </View>
              <Text style={styles.cardLabelGray}>Last Payout</Text>
              <Text style={styles.cardValueDark}>₱{lastPayout.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.cardSubtextGray}>{new Date(lastPayout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
          )}
        </View>

        {/* Payout Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Payout Schedule</Text><Text style={styles.sectionSubtitle}>Automatic payouts every Friday</Text></View>
            <View style={styles.nextPayoutBadge}><Calendar size={14} color="#10B981" /><Text style={styles.nextPayoutText}>Friday, Jan 26</Text></View>
          </View>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleCard}><View style={styles.scheduleIcon}><Calendar size={20} color="#3B82F6" /></View><Text style={styles.scheduleLabel}>Payout Frequency</Text><Text style={styles.scheduleValue}>Weekly</Text><Text style={styles.scheduleSubtext}>Every Friday at 5:00 PM PHT</Text></View>
            <View style={styles.scheduleCard}><View style={styles.scheduleIcon}><Clock size={20} color="#8B5CF6" /></View><Text style={styles.scheduleLabel}>Processing Time</Text><Text style={styles.scheduleValue}>1-3 Business Days</Text><Text style={styles.scheduleSubtext}>Funds arrive in your account</Text></View>
            <View style={styles.scheduleCard}><View style={styles.scheduleIcon}><DollarSign size={20} color="#D97706" /></View><Text style={styles.scheduleLabel}>Minimum Payout</Text><Text style={styles.scheduleValue}>₱500.00</Text><Text style={styles.scheduleSubtext}>Required minimum balance</Text></View>
          </View>
        </View>

        {/* Bank Account */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Bank Account</Text><TouchableOpacity style={styles.updateButton}><Text style={styles.updateButtonText}>Update Account</Text></TouchableOpacity></View>
          <View style={styles.bankCard}>
            <View style={styles.bankRow}><Text style={styles.bankLabel}>Account Name</Text><Text style={styles.bankValue}>My Awesome Store</Text></View>
            <View style={styles.bankRow}><Text style={styles.bankLabel}>Bank Name</Text><Text style={styles.bankValue}>BDO Unibank</Text></View>
            <View style={styles.bankRow}><Text style={styles.bankLabel}>Account Number</Text><Text style={[styles.bankValue, styles.monoText]}>****7890</Text></View>
          </View>
        </View>

        {/* Payout History */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Payout History</Text><TouchableOpacity style={styles.downloadButton}><Download size={16} color="#6B7280" /><Text style={styles.downloadText}>Download Report</Text></TouchableOpacity></View>
          {payoutHistory.map(payout => (<View key={payout.id} style={styles.payoutRow}><View style={styles.payoutInfo}><Text style={styles.payoutDate}>{new Date(payout.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Text><Text style={styles.payoutReference}>{payout.reference}</Text></View><View style={styles.payoutRight}><Text style={styles.payoutAmount}>₱{payout.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text><View style={styles.completedBadge}><CheckCircle size={12} color="#10B981" /><Text style={styles.completedText}>Completed</Text></View></View></View>))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF4EC',
  },
  headerContainer: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { 
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  scrollView: {
    flex: 1,
  },
  cardsGrid: {
    padding: 16,
    gap: 12,
  },
  totalCard: {
    backgroundColor: '#D97706',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  availableCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    padding: 20,
    borderRadius: 12,
  },
  pendingCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    padding: 20,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconOrange: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconGreen: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconYellow: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  cardLabelGray: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValueWhite: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardValueDark: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  cardSubtextGray: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  lastSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  nextPayoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextPayoutText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleCard: {
    backgroundColor: '#FFF4EC',
    padding: 12,
    borderRadius: 8,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  scheduleValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  scheduleSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  updateButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  bankCard: {
    backgroundColor: '#FFF4EC',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  bankRow: {
    paddingVertical: 4,
  },
  bankLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  bankValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  monoText: {
    fontFamily: 'monospace',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  payoutReference: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
});