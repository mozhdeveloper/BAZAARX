import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, Mail, Phone, Clock, ChevronRight, FileText, Headphones } from 'lucide-react-native';
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

export default function HelpSupportScreen({ navigation }: Props) {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>
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
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
});
