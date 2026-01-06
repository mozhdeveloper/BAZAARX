import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, FileText } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      content: [
        {
          subtitle: 'Personal Information',
          text: 'We collect information you provide directly to us, including your name, email address, phone number, shipping address, and payment information when you create an account or make a purchase.',
        },
        {
          subtitle: 'Usage Information',
          text: 'We automatically collect information about your interactions with our app, including pages viewed, products browsed, search queries, and purchase history.',
        },
        {
          subtitle: 'Device Information',
          text: 'We collect information about the mobile device you use to access our services, including device type, operating system, unique device identifiers, and mobile network information.',
        },
      ],
    },
    {
      icon: Lock,
      title: 'How We Use Your Information',
      content: [
        {
          subtitle: 'Service Delivery',
          text: 'We use your information to process orders, deliver products, provide customer support, and communicate with you about your purchases.',
        },
        {
          subtitle: 'Personalization',
          text: 'Your data helps us personalize your shopping experience, recommend products, and show relevant deals and promotions based on your preferences.',
        },
        {
          subtitle: 'Security & Fraud Prevention',
          text: 'We use your information to detect, prevent, and respond to fraud, security breaches, and other potentially harmful activities.',
        },
      ],
    },
    {
      icon: Eye,
      title: 'Information Sharing',
      content: [
        {
          subtitle: 'With Sellers',
          text: 'We share your order information with sellers to fulfill your purchases, including your name, shipping address, and contact details.',
        },
        {
          subtitle: 'Service Providers',
          text: 'We work with trusted third-party service providers who assist with payment processing, shipping, analytics, and customer support.',
        },
        {
          subtitle: 'Legal Requirements',
          text: 'We may disclose your information if required by law, court order, or government request, or to protect our rights and the safety of our users.',
        },
      ],
    },
    {
      icon: Shield,
      title: 'Data Security',
      content: [
        {
          subtitle: 'Encryption',
          text: 'All data transmission is encrypted using industry-standard SSL/TLS protocols. Payment information is processed through secure, PCI-compliant payment gateways.',
        },
        {
          subtitle: 'Access Controls',
          text: 'We implement strict access controls and authentication measures to ensure only authorized personnel can access your personal information.',
        },
        {
          subtitle: 'Regular Audits',
          text: 'Our security practices are regularly reviewed and updated to protect against emerging threats and maintain the highest security standards.',
        },
      ],
    },
    {
      icon: UserCheck,
      title: 'Your Rights',
      content: [
        {
          subtitle: 'Access & Correction',
          text: 'You have the right to access, update, or correct your personal information at any time through your account settings.',
        },
        {
          subtitle: 'Data Deletion',
          text: 'You can request deletion of your account and associated data by contacting our support team. Some information may be retained for legal or business purposes.',
        },
        {
          subtitle: 'Marketing Preferences',
          text: 'You can opt out of marketing communications at any time by updating your notification preferences or clicking unsubscribe in our emails.',
        },
      ],
    },
    {
      icon: FileText,
      title: 'Data Retention',
      content: [
        {
          subtitle: 'Account Data',
          text: 'We retain your account information as long as your account is active or as needed to provide you services.',
        },
        {
          subtitle: 'Transaction Records',
          text: 'Order and transaction information is retained for accounting, tax, and legal purposes in accordance with applicable laws.',
        },
        {
          subtitle: 'Inactive Accounts',
          text: 'Accounts inactive for more than 2 years may be deleted after providing you with advance notice.',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Shield size={32} color="#FF6A00" />
          </View>
          <Text style={styles.heroTitle}>Your Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            Last updated: December 19, 2024
          </Text>
          <Text style={styles.heroText}>
            At BazaarX, we are committed to protecting your privacy and ensuring the security of
            your personal information. This policy explains how we collect, use, and safeguard your data.
          </Text>
        </View>

        {/* Policy Sections */}
        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <section.icon size={24} color="#FF6A00" />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {section.content.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.contentBlock}>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <Text style={styles.contentText}>{item.text}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions About Privacy?</Text>
          <Text style={styles.contactText}>
            If you have any questions about this Privacy Policy or how we handle your data, please
            contact us:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactDetail}>Email: privacy@bazaarx.ph</Text>
            <Text style={styles.contactDetail}>Phone: +63 2 1234 5678</Text>
            <Text style={styles.contactDetail}>Address: BazaarX Building, Makati City, Philippines</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using BazaarX, you agree to this Privacy Policy. We may update this policy from time
            to time, and we will notify you of any significant changes.
          </Text>
          <Text style={styles.copyrightText}>© 2024 BazaarX. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
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
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  heroText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEF3E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  contentBlock: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  contentText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#3B82F6',
    lineHeight: 20,
    marginBottom: 12,
  },
  contactInfo: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },
  contactDetail: {
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
