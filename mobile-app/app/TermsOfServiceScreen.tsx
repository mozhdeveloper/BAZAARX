import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, FileText, Scale, ShieldCheck, AlertTriangle, Ban, Wallet, Truck, RotateCcw, MessageCircle, Globe, Gavel } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';

type Props = {
  navigation: any;
};

const EFFECTIVE_DATE = 'March 1, 2026';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  paragraphs: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'acceptance',
    icon: <FileText size={18} color={COLORS.primary} />,
    title: '1. Acceptance of Terms',
    paragraphs: [
      'By creating an account, accessing, or using the BazaarX mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App.',
      'We may update these Terms from time to time. Continued use of the App after changes are posted constitutes acceptance of the revised Terms. We encourage you to review this page periodically.',
    ],
  },
  {
    id: 'eligibility',
    icon: <ShieldCheck size={18} color={COLORS.primary} />,
    title: '2. Eligibility',
    paragraphs: [
      'You must be at least 18 years old (or the legal age of majority in your jurisdiction) to create an account and use BazaarX. By using the App, you represent that you meet this requirement.',
      'Accounts registered by bots or automated means are not permitted and will be terminated.',
    ],
  },
  {
    id: 'accounts',
    icon: <ShieldCheck size={18} color={COLORS.primary} />,
    title: '3. Accounts & Security',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of your login credentials. Any activity under your account is your responsibility.',
      'Notify us immediately at support@bazaarx.com if you suspect unauthorized access. BazaarX is not liable for losses arising from unauthorized use of your account.',
      'We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or remain inactive for more than 12 consecutive months.',
    ],
  },
  {
    id: 'marketplace',
    icon: <Globe size={18} color={COLORS.primary} />,
    title: '4. Marketplace Rules',
    paragraphs: [
      'BazaarX is a platform connecting independent buyers and sellers. BazaarX is not a party to transactions between buyers and sellers; we facilitate the marketplace only.',
      'Sellers are solely responsible for the accuracy of product listings, pricing, inventory, and fulfillment. BazaarX does not guarantee product quality, legality, or safety.',
      'Buyers should review product descriptions, seller ratings, and return policies before purchasing. All sales are between the buyer and the seller directly.',
    ],
  },
  {
    id: 'orders',
    icon: <Truck size={18} color={COLORS.primary} />,
    title: '5. Orders & Delivery',
    paragraphs: [
      'When you place an order, it constitutes an offer to purchase. The order is confirmed once the seller accepts it. BazaarX will send a notification upon confirmation.',
      'Delivery times are estimates provided by sellers. BazaarX is not responsible for delays caused by sellers, couriers, weather, or other external factors.',
      'Ensure your delivery address is accurate. BazaarX and sellers are not liable for failed deliveries due to incorrect addresses provided by the buyer.',
    ],
  },
  {
    id: 'payments',
    icon: <Wallet size={18} color={COLORS.primary} />,
    title: '6. Payments & Pricing',
    paragraphs: [
      'All prices are listed in Philippine Pesos (₱) unless otherwise stated. Prices are set by sellers and may change without notice.',
      'BazaarX supports Cash on Delivery (COD), credit/debit cards, and digital wallets. Payment processing is handled by secure third-party providers.',
      'BazCoins earned through purchases may be redeemed for discounts at checkout. BazCoins have no cash value and cannot be transferred or sold. BazaarX reserves the right to modify the BazCoins program at any time.',
    ],
  },
  {
    id: 'returns',
    icon: <RotateCcw size={18} color={COLORS.primary} />,
    title: '7. Returns & Refunds',
    paragraphs: [
      'Return requests must be submitted within 7 days of delivery. Items must be unused, in original packaging, and with all tags attached unless the item is defective.',
      'Once a return is approved, refunds are processed within 5–7 business days to the original payment method or as BazCoins, depending on the seller\'s policy.',
      'BazaarX may mediate disputes between buyers and sellers but is not obligated to issue refunds. Final refund decisions rest with the seller in accordance with their stated return policy.',
    ],
  },
  {
    id: 'prohibited',
    icon: <Ban size={18} color={COLORS.primary} />,
    title: '8. Prohibited Conduct',
    paragraphs: [
      'You agree not to: (a) list or sell counterfeit, illegal, or restricted items; (b) manipulate reviews or ratings; (c) harass, threaten, or abuse other users; (d) use the App for money laundering, fraud, or any illegal purpose.',
      'Sellers must not engage in price gouging, bait-and-switch tactics, or misrepresentation of products. Violations may result in immediate account suspension.',
      'Users must not attempt to circumvent BazaarX\'s systems, scrape data, reverse-engineer the App, or introduce malware or harmful code.',
    ],
  },
  {
    id: 'ip',
    icon: <Scale size={18} color={COLORS.primary} />,
    title: '9. Intellectual Property',
    paragraphs: [
      'All content, trademarks, logos, and software on the BazaarX App are owned by or licensed to BazaarX. You may not copy, modify, distribute, or create derivative works without our written consent.',
      'Sellers retain ownership of their product photos and descriptions but grant BazaarX a non-exclusive, worldwide license to display them on the platform for marketing and operational purposes.',
    ],
  },
  {
    id: 'privacy',
    icon: <ShieldCheck size={18} color={COLORS.primary} />,
    title: '10. Privacy',
    paragraphs: [
      'Your use of BazaarX is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal data. By using the App, you consent to our data practices as described in the Privacy Policy.',
    ],
  },
  {
    id: 'liability',
    icon: <AlertTriangle size={18} color={COLORS.primary} />,
    title: '11. Limitation of Liability',
    paragraphs: [
      'BazaarX provides the App "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted or error-free service.',
      'To the maximum extent permitted by law, BazaarX shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.',
      'Our total liability for any claim shall not exceed the amount you paid to BazaarX (not to individual sellers) in the 12 months preceding the claim.',
    ],
  },
  {
    id: 'disputes',
    icon: <Gavel size={18} color={COLORS.primary} />,
    title: '12. Dispute Resolution',
    paragraphs: [
      'Any dispute arising from these Terms or your use of the App shall first be resolved through good-faith negotiation. If unresolved within 30 days, the dispute shall be submitted to binding arbitration in accordance with Philippine law.',
      'You agree to resolve disputes on an individual basis and waive any right to participate in class action lawsuits or class-wide arbitration.',
    ],
  },
  {
    id: 'contact',
    icon: <MessageCircle size={18} color={COLORS.primary} />,
    title: '13. Contact Us',
    paragraphs: [
      'If you have questions about these Terms, please reach out:\n\n• Email: support@bazaarx.com\n• In-App: Help Center → Chat Support\n• Response Time: 1–2 business days',
    ],
  },
];

export default function TermsOfServiceScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient colors={['#D97706', '#B45309']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <Text style={styles.headerSubtitle}>Last updated {EFFECTIVE_DATE}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Banner */}
        <View style={styles.introBanner}>
          <Scale size={22} color={COLORS.primary} />
          <Text style={styles.introText}>
            Please read these terms carefully before using BazaarX. They govern your rights and obligations as a user of our marketplace.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>{section.icon}</View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.paragraphs.map((p, idx) => (
              <Text key={idx} style={styles.paragraph}>{p}</Text>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing to use BazaarX, you acknowledge that you have read, understood, and agree to these Terms of Service.
          </Text>
          <Text style={styles.footerDate}>Effective: {EFFECTIVE_DATE}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Intro
  introBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE8C8',
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray900,
    lineHeight: 19,
  },
  // Sections
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0E6D3',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  paragraph: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  // Footer
  footer: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE8C8',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.gray900,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  footerDate: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
