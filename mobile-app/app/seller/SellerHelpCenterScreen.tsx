import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MessageCircle,
  Clock,
  ChevronRight,
  Headphones,
  Ticket,
  AlertTriangle,
  FileText,
  Menu,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../../src/constants/theme';
import { TicketService } from '../../services/TicketService';
import { useAuthStore } from '../../src/stores/authStore';
import { useSellerStore } from '../../src/stores/sellerStore';
import SellerDrawer from '../../src/components/SellerDrawer';
import type { Ticket as TicketType } from '../types/ticketTypes';

type RootStackParamList = {
  SellerCreateTicket: undefined;
  SellerTicketDetail: { ticketId: string };
  SellerBuyerReports: undefined;
};

export default function SellerHelpCenterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { seller } = useSellerStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets' | 'reports'>('faq');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [buyerReports, setBuyerReports] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [buyerReportCount, setBuyerReportCount] = useState(0);

  useEffect(() => {
    if (activeTab === 'tickets' && user?.id) {
      loadTickets();
    } else if (activeTab === 'reports' && seller?.id) {
      loadBuyerReports();
    }
  }, [activeTab, user?.id, seller?.id]);

  useEffect(() => {
    // Load buyer report count on mount
    if (seller?.id) {
      loadBuyerReportCount();
    }
  }, [seller?.id]);

  const loadTickets = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const fetchedTickets = await TicketService.fetchTickets(user.id);
      setTickets(fetchedTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuyerReports = async () => {
    if (!seller?.id) return;
    setLoading(true);
    try {
      const reports = await TicketService.getTicketsAboutSeller(seller.id);
      setBuyerReports(reports);
    } catch (error) {
      console.error('Error loading buyer reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuyerReportCount = async () => {
    if (!seller?.id) return;
    try {
      const count = await TicketService.getTicketCountAboutSeller(seller.id);
      setBuyerReportCount(count);
    } catch (error) {
      console.error('Error loading buyer report count:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'tickets' && user?.id) {
        const fetchedTickets = await TicketService.fetchTickets(user.id);
        setTickets(fetchedTickets);
      } else if (activeTab === 'reports' && seller?.id) {
        const reports = await TicketService.getTicketsAboutSeller(seller.id);
        setBuyerReports(reports);
        loadBuyerReportCount();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, user?.id, seller?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#3B82F6';
      case 'in_progress': return '#F59E0B';
      case 'waiting_response': return '#8B5CF6';
      case 'resolved': return '#10B981';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const openTicketCount = tickets.filter(
    t => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_response'
  ).length;

  const faqs = [
    {
      id: '1',
      category: 'Orders',
      question: 'How do I process an order?',
      answer: 'Go to Orders tab, find the pending order, and tap "Process Order". You can then pack the items and mark them ready to ship.',
    },
    {
      id: '2',
      category: 'Orders',
      question: 'What if a buyer requests a cancellation?',
      answer: 'You\'ll receive a notification. Go to the order details and approve or decline the cancellation. If approved, the buyer will be refunded automatically.',
    },
    {
      id: '3',
      category: 'Products',
      question: 'How do I add a new product?',
      answer: 'Go to Products tab and tap the "+" button. Fill in product details, upload images, set pricing, and submit for review.',
    },
    {
      id: '4',
      category: 'Payments',
      question: 'When do I get paid?',
      answer: 'Payments are processed weekly. Earnings from completed orders are released after the buyer return period (7 days) ends.',
    },
    {
      id: '5',
      category: 'Payments',
      question: 'How do I set up my payout method?',
      answer: 'Go to Settings > Payment Methods and add your bank account or e-wallet details for receiving payouts.',
    },
    {
      id: '6',
      category: 'Support',
      question: 'How do I handle buyer complaints?',
      answer: 'Check the "Buyer Reports" section to see any complaints filed about your store. Respond promptly and work towards resolution.',
    },
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const faqsByCategory = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, typeof faqs>);

  const quickActions = [
    {
      icon: Ticket,
      title: 'Submit Ticket',
      subtitle: 'Get help from support',
      color: '#FF6A00',
      onPress: () => navigation.navigate('SellerCreateTicket'),
    },
    {
      icon: AlertTriangle,
      title: 'Buyer Reports',
      subtitle: `${buyerReportCount} reports about your store`,
      color: '#EF4444',
      badge: buyerReportCount > 0 ? buyerReportCount : undefined,
      onPress: () => setActiveTab('reports'),
    },
    {
      icon: Clock,
      title: 'My Tickets',
      subtitle: `${openTicketCount} open tickets`,
      color: '#3B82F6',
      badge: openTicketCount > 0 ? openTicketCount : undefined,
      onPress: () => setActiveTab('tickets'),
    },
  ];

  const renderTicketCard = (ticket: TicketType, isReport = false) => (
    <Pressable
      key={ticket.id}
      style={styles.ticketCard}
      onPress={() => navigation.navigate('SellerTicketDetail', { ticketId: ticket.id })}
    >
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketId}>{ticket.id.substring(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ticket.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
            {getStatusLabel(ticket.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.ticketSubject}>{ticket.subject}</Text>
      <View style={styles.ticketFooter}>
        <Text style={styles.ticketCategory}>{ticket.categoryName || 'General'}</Text>
        <Text style={styles.ticketDate}>
          {new Date(ticket.updatedAt).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => setDrawerVisible(true)} style={styles.headerIconButton}>
            <Menu size={24} color="#FFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Help Center</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'faq' && styles.activeTabButton]}
          onPress={() => setActiveTab('faq')}
        >
          <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>FAQs</Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'tickets' && styles.activeTabButton]}
          onPress={() => setActiveTab('tickets')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>My Tickets</Text>
            {openTicketCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{openTicketCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'reports' && styles.activeTabButton]}
          onPress={() => setActiveTab('reports')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Reports</Text>
            {buyerReportCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.countBadgeText}>{buyerReportCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          activeTab !== 'faq' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          ) : undefined
        }
      >
        {activeTab === 'faq' ? (
          <>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <Headphones size={32} color="#FF6A00" />
              </View>
              <Text style={styles.heroTitle}>Seller Support</Text>
              <Text style={styles.heroSubtitle}>
                Get help managing your store, orders, and payouts
              </Text>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              {quickActions.map((action, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
                  onPress={action.onPress}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                    <action.icon size={24} color={action.color} />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                  </View>
                  {action.badge && (
                    <View style={[styles.actionBadge, { backgroundColor: action.color }]}>
                      <Text style={styles.actionBadgeText}>{action.badge}</Text>
                    </View>
                  )}
                  <ChevronRight size={20} color="#9CA3AF" />
                </Pressable>
              ))}
            </View>

            {/* FAQs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              {Object.entries(faqsByCategory).map(([category, categoryFaqs]) => (
                <View key={category}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {categoryFaqs.map((faq) => (
                    <View key={faq.id} style={styles.faqCard}>
                      <Pressable style={styles.faqQuestion} onPress={() => toggleFaq(faq.id)}>
                        <Text style={styles.faqQuestionText}>{faq.question}</Text>
                        <ChevronRight
                          size={20}
                          color="#6B7280"
                          style={[styles.faqChevron, expandedFaq === faq.id && styles.faqChevronExpanded]}
                        />
                      </Pressable>
                      {expandedFaq === faq.id && (
                        <View style={styles.faqAnswer}>
                          <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : activeTab === 'tickets' ? (
          <View style={styles.ticketsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading tickets...</Text>
              </View>
            ) : tickets.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageCircle size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No tickets yet</Text>
                <Text style={styles.emptyStateSubtext}>Need help? Create a new support ticket.</Text>
                <Pressable
                  style={styles.createButton}
                  onPress={() => navigation.navigate('SellerCreateTicket')}
                >
                  <Text style={styles.createButtonText}>Create Ticket</Text>
                </Pressable>
              </View>
            ) : (
              tickets.map((ticket) => renderTicketCard(ticket))
            )}
          </View>
        ) : (
          <View style={styles.ticketsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading buyer reports...</Text>
              </View>
            ) : buyerReports.length === 0 ? (
              <View style={styles.emptyState}>
                <AlertTriangle size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No buyer reports</Text>
                <Text style={styles.emptyStateSubtext}>Great job! No complaints have been filed about your store.</Text>
              </View>
            ) : (
              <>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportHeaderText}>
                    {buyerReports.length} report{buyerReports.length !== 1 ? 's' : ''} about your store
                  </Text>
                </View>
                {buyerReports.map((report) => renderTicketCard(report, true))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {activeTab === 'tickets' && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate('SellerCreateTicket')}
        >
          <Text style={styles.fabText}>+ New Ticket</Text>
        </Pressable>
      )}

      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  actionBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    paddingHorizontal: 8,
  },
  actionBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  faqCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginRight: 12,
  },
  faqChevron: {
    transform: [{ rotate: '0deg' }],
  },
  faqChevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginTop: 12,
  },
  ticketsContainer: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketCategory: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reportHeader: {
    marginBottom: 16,
  },
  reportHeaderText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  createButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
