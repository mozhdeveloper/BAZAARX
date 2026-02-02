import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, Mail, Phone, Clock, ChevronRight, FileText, Headphones, Ticket } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpSupport'>;

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function HelpCenterScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets'>('faq');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab]);

  const loadTickets = async () => {
    setLoading(true);
    // Simulate fetching
    setTimeout(() => {
        const MOCK_TICKETS = [
            {
                id: 'TKT-1001',
                category: 'Order',
                subject: 'Missing item in delivery',
                status: 'in_progress',
                updatedAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
                id: 'TKT-1002',
                category: 'Account',
                subject: 'Cannot update profile picture',
                status: 'open',
                updatedAt: new Date(Date.now() - 43200000).toISOString(),
            },
             {
                id: 'TKT-1003',
                category: 'Payment',
                subject: 'Refund not received',
                status: 'resolved',
                updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            }
        ];
        setTickets(MOCK_TICKETS);
        setLoading(false);
    }, 500);
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'open': return '#3B82F6'; // Blue
          case 'in_progress': return '#F59E0B'; // Amber
          case 'resolved': return '#10B981'; // Green
          case 'closed': return '#6B7280'; // Gray
          default: return '#6B7280';
      }
  };

  const getStatusLabel = (status: string) => {
      return status.replace('_', ' ').toUpperCase();
  };


  const faqs: FAQ[] = [
    {
      id: '1',
      category: 'Orders',
      question: 'How do I track my order?',
      answer: 'You can track your order by going to the "Orders" tab and selecting your order. You\'ll see real-time tracking information with delivery updates.',
    },
    {
      id: '2',
      category: 'Orders',
      question: 'Can I cancel my order?',
      answer: 'Yes, you can cancel your order within 24 hours of placing it. Go to Order Details and tap "Cancel Order". Refunds will be processed within 5-7 business days.',
    },
    {
      id: '3',
      category: 'Payments',
      question: 'What payment methods do you accept?',
      answer: 'We accept credit/debit cards (Visa, Mastercard, Amex), bank transfers, GCash, PayMaya, and Cash on Delivery for eligible areas.',
    },
    {
      id: '4',
      category: 'Payments',
      question: 'Is my payment information secure?',
      answer: 'Yes, all payment information is encrypted using industry-standard SSL technology. We never store your complete card details on our servers.',
    },
    {
      id: '5',
      category: 'Shipping',
      question: 'How long does delivery take?',
      answer: 'Delivery typically takes 2-5 business days for Metro Manila and 5-10 business days for provincial areas. Express shipping is available for select locations.',
    },
    {
      id: '6',
      category: 'Shipping',
      question: 'Do you offer free shipping?',
      answer: 'Yes! We offer free shipping on orders above ₱500 within Metro Manila. Provincial areas may have different minimum order requirements.',
    },
    {
      id: '7',
      category: 'Returns',
      question: 'What is your return policy?',
      answer: 'We accept returns within 7 days of delivery for most items. Products must be unused, in original packaging with tags attached. Contact the seller for return instructions.',
    },
    {
      id: '8',
      category: 'Account',
      question: 'How do I reset my password?',
      answer: 'Go to Settings > Account Security > Change Password. You can also use "Forgot Password" on the login screen to receive a reset link via email.',
    },
  ];

  const contactOptions = [
    {
      icon: Ticket,
      title: 'Submit a Support Ticket',
      subtitle: 'Create a ticket and track your concern',
      color: '#FF6A00',
      onPress: () => navigation.navigate('CreateTicket'),
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      subtitle: 'Chat with our support team',
      color: '#8B5CF6',
      onPress: () => console.log('Open live chat'),
    },
    {
      icon: Mail,
      title: 'Email Support',
      subtitle: 'support@bazaarx.ph',
      color: '#3B82F6',
      onPress: () => Linking.openURL('mailto:support@bazaarx.ph'),
    },
    {
      icon: Phone,
      title: 'Call Us',
      subtitle: '+63 2 1234 5678',
      color: '#10B981',
      onPress: () => Linking.openURL('tel:+6321234567'),
    },
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const faqsByCategory = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Help & Support</Text>
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
            <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>My Tickets</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'faq' ? (
             <>
             {/* Hero Section */}
             <View style={styles.heroSection}>
               <View style={styles.heroIcon}>
                 <Headphones size={32} color="#FF6A00" />
               </View>
               <Text style={styles.heroTitle}>How can we help you?</Text>
               <Text style={styles.heroSubtitle}>
                 We're here to assist you 24/7. Get instant help or contact our support team.
               </Text>
             </View>
     
             {/* Contact Options */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Contact Us</Text>
               {contactOptions.map((option, index) => (
                 <Pressable
                   key={index}
                   style={({ pressed }) => [
                     styles.contactCard,
                     pressed && styles.contactCardPressed,
                   ]}
                   onPress={option.onPress}
                 >
                   <View style={[styles.contactIcon, { backgroundColor: `${option.color}15` }]}>
                     <option.icon size={24} color={option.color} />
                   </View>
                   <View style={styles.contactInfo}>
                     <Text style={styles.contactTitle}>{option.title}</Text>
                     <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
                   </View>
                   <ChevronRight size={20} color="#9CA3AF" />
                 </Pressable>
               ))}
             </View>
     
             {/* Business Hours */}
             <View style={styles.hoursCard}>
               <Clock size={20} color="#FF6A00" />
               <View style={styles.hoursInfo}>
                 <Text style={styles.hoursTitle}>Support Hours</Text>
                 <Text style={styles.hoursText}>Monday - Saturday: 8:00 AM - 8:00 PM</Text>
                 <Text style={styles.hoursText}>Sunday: 9:00 AM - 6:00 PM</Text>
               </View>
             </View>
     
             {/* FAQs */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
               
               {Object.entries(faqsByCategory).map(([category, categoryFaqs]) => (
                 <View key={category}>
                   <Text style={styles.categoryTitle}>{category}</Text>
                   {categoryFaqs.map((faq) => (
                     <View key={faq.id} style={styles.faqCard}>
                       <Pressable
                         style={styles.faqQuestion}
                         onPress={() => toggleFaq(faq.id)}
                       >
                         <Text style={styles.faqQuestionText}>{faq.question}</Text>
                         <ChevronRight
                           size={20}
                           color="#6B7280"
                           style={[
                             styles.faqChevron,
                             expandedFaq === faq.id && styles.faqChevronExpanded,
                           ]}
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
     
             {/* Additional Resources */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>More Resources</Text>
               
               <Pressable
                 style={({ pressed }) => [
                   styles.resourceCard,
                   pressed && styles.resourceCardPressed,
                 ]}
               >
                 <FileText size={20} color="#FF6A00" />
                 <View style={styles.resourceInfo}>
                   <Text style={styles.resourceTitle}>User Guide</Text>
                   <Text style={styles.resourceSubtitle}>Learn how to use BazaarX</Text>
                 </View>
                 <ChevronRight size={20} color="#9CA3AF" />
               </Pressable>
     
               <Pressable
                 style={({ pressed }) => [
                   styles.resourceCard,
                   pressed && styles.resourceCardPressed,
                 ]}
               >
                 <FileText size={20} color="#FF6A00" />
                 <View style={styles.resourceInfo}>
                   <Text style={styles.resourceTitle}>Terms of Service</Text>
                   <Text style={styles.resourceSubtitle}>Read our terms & conditions</Text>
                 </View>
                 <ChevronRight size={20} color="#9CA3AF" />
               </Pressable>
             </View>
           </>
        ) : (
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
                         <Text style={styles.emptyStateSubtext}>Need help with something? Create a new ticket.</Text>
                    </View>
                ) : (
                    tickets.map((ticket) => (
                        <Pressable 
                            key={ticket.id} 
                            style={styles.ticketCard}
                            onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                        >
                            <View style={styles.ticketHeader}>
                                <Text style={styles.ticketId}>{ticket.id}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(ticket.status)}20` }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                                        {getStatusLabel(ticket.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                            <View style={styles.ticketFooter}>
                                <Text style={styles.ticketCategory}>{ticket.category}</Text>
                                <Text style={styles.ticketDate}>
                                    {new Date(ticket.updatedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </View>
        )}
      </ScrollView>

      {activeTab === 'tickets' && (
          <Pressable 
            style={({pressed}) => [styles.fab, pressed && { opacity: 0.8 }]}
            onPress={() => navigation.navigate('CreateTicket')}
          >
              <Text style={styles.fabText}>+ New Ticket</Text>
          </Pressable>
      )}
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
    marginBottom: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
  },
  activeTabButton: {
      borderBottomColor: COLORS.primary,
  },
  tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#9CA3AF',
  },
  activeTabText: {
      color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // Space for FAB
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardPressed: {
    opacity: 0.6,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  hoursCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3E8',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  hoursInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hoursTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6A00',
    marginBottom: 6,
  },
  hoursText: {
    fontSize: 13,
    color: '#FF6A00',
    lineHeight: 18,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontWeight: '600',
    color: '#111827',
    paddingRight: 12,
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
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resourceCardPressed: {
    opacity: 0.6,
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 14,
  },
  resourceTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  resourceSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  ticketsContainer: {
      paddingHorizontal: 20,
      paddingTop: 10,
  },
  ticketCard: {
      backgroundColor: '#FFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
  },
  ticketHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  ticketId: {
      fontSize: 14,
      fontWeight: '600',
      color: '#9CA3AF',
  },
  statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
  },
  statusText: {
      fontSize: 12,
      fontWeight: '700',
  },
  ticketSubject: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 8,
  },
  ticketFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  ticketCategory: {
      fontSize: 14,
      color: '#6B7280',
  },
  ticketDate: {
      fontSize: 12,
      color: '#9CA3AF',
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
  }
});
