import React, { useState } from 'react';
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
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Search,
  CreditCard,
  Truck,
  RotateCcw,
  User,
  Heart,
  MessageCircle,
  Store,
  Shield,
  Star,
  Gift,
  MapPin,
  Bell,
} from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';

type Props = {
  navigation: any;
};

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  steps: { heading: string; body: string }[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    icon: <User size={20} color={COLORS.primary} />,
    title: 'Getting Started',
    steps: [
      {
        heading: 'Create Your Account',
        body: 'Download BazaarX from the App Store or Google Play. Tap "Sign Up" and enter your name, email, and password. You can also sign up using Google or Apple for faster access.',
      },
      {
        heading: 'Set Up Your Profile',
        body: 'Go to your Profile tab to add a photo, update your display name, and set your default delivery address. A complete profile helps sellers process your orders faster.',
      },
      {
        heading: 'Add a Delivery Address',
        body: 'Navigate to Settings → Addresses → Add Address. You can pin your location on the map or type it manually. Set one as your default for quicker checkouts.',
      },
    ],
  },
  {
    id: 'browsing',
    icon: <Search size={20} color={COLORS.primary} />,
    title: 'Browsing & Searching',
    steps: [
      {
        heading: 'Explore the Home Feed',
        body: 'The Home tab shows featured products, flash sales, trending items, and recommended stores. Scroll through categories at the top to filter by type.',
      },
      {
        heading: 'Search for Products',
        body: 'Tap the search bar and type a product name, brand, or keyword. Use filters for price range, category, ratings, and more to narrow results.',
      },
      {
        heading: 'Follow Your Favorite Stores',
        body: 'Visit any store page and tap "Follow" to see their new arrivals in your feed. You can manage followed stores from the Following Shops screen.',
      },
    ],
  },
  {
    id: 'shopping',
    icon: <ShoppingBag size={20} color={COLORS.primary} />,
    title: 'Shopping & Cart',
    steps: [
      {
        heading: 'Add Items to Cart',
        body: 'On any product page, select size/variant if available, then tap "Add to Cart." The cart icon in the tab bar shows your item count.',
      },
      {
        heading: 'Manage Your Cart',
        body: 'In the Cart tab, adjust quantities with + / − buttons, swipe left to remove an item, or tap the trash icon. Your cart totals update in real time.',
      },
      {
        heading: 'Save for Later',
        body: 'Tap the heart icon on any product to add it to your Wishlist. Access saved items anytime from Profile → Wishlist.',
      },
    ],
  },
  {
    id: 'checkout',
    icon: <CreditCard size={20} color={COLORS.primary} />,
    title: 'Checkout & Payments',
    steps: [
      {
        heading: 'Review Your Order',
        body: 'At checkout, confirm your delivery address, review items, and choose a payment method. You can also apply promo codes or use BazCoins for discounts.',
      },
      {
        heading: 'Payment Methods',
        body: 'BazaarX supports Cash on Delivery (COD), credit/debit cards, and digital wallets. You can save cards securely for future checkouts.',
      },
      {
        heading: 'Order Confirmation',
        body: 'After placing your order you\'ll see a confirmation screen with your order number and estimated delivery. A notification is also sent to your inbox.',
      },
    ],
  },
  {
    id: 'tracking',
    icon: <Truck size={20} color={COLORS.primary} />,
    title: 'Order Tracking',
    steps: [
      {
        heading: 'View Your Orders',
        body: 'Go to Profile → Orders to see all your purchases. Filter by status: Pending, Confirmed, Shipped, Delivered, or Cancelled.',
      },
      {
        heading: 'Track a Shipment',
        body: 'Tap any active order to open the detail page, then tap "Track Delivery" to see live status updates from the seller.',
      },
      {
        heading: 'Delivery Notifications',
        body: 'Enable push notifications in Settings → Notifications to receive real-time alerts when your order is confirmed, shipped, and delivered.',
      },
    ],
  },
  {
    id: 'returns',
    icon: <RotateCcw size={20} color={COLORS.primary} />,
    title: 'Returns & Refunds',
    steps: [
      {
        heading: 'Start a Return',
        body: 'Within 7 days of delivery, go to Order Detail → Return Request. Select the reason and upload photos if needed. The seller will review within 48 hours.',
      },
      {
        heading: 'Return Pickup',
        body: 'Once approved, arrange a pickup or drop-off. BazaarX will provide instructions based on the seller\'s return policy.',
      },
      {
        heading: 'Get Your Refund',
        body: 'Refunds are processed within 5–7 business days after the return is received. The amount goes back to your original payment method or as BazCoins.',
      },
    ],
  },
  {
    id: 'wishlist-registry',
    icon: <Gift size={20} color={COLORS.primary} />,
    title: 'Wishlists & Gift Registry',
    steps: [
      {
        heading: 'Create a Wishlist',
        body: 'Heart any product to save it. View and manage all wishlisted items from Profile → Wishlist.',
      },
      {
        heading: 'Share a Wishlist',
        body: 'Tap the share icon on your Wishlist page to generate a link. Friends and family can view and purchase items for you.',
      },
      {
        heading: 'Gift Registry',
        body: 'Use Find Registry to search for someone\'s shared wishlist by name and purchase gifts directly from their list.',
      },
    ],
  },
  {
    id: 'bazcoins',
    icon: <Star size={20} color={COLORS.primary} />,
    title: 'BazCoins Rewards',
    steps: [
      {
        heading: 'Earning BazCoins',
        body: 'You earn BazCoins on every purchase. The amount depends on the order total. BazCoins are credited after delivery is confirmed.',
      },
      {
        heading: 'Redeeming BazCoins',
        body: 'At checkout, toggle "Use BazCoins" to apply your balance as a discount. 100 BazCoins = ₱1 off.',
      },
      {
        heading: 'Check Your Balance',
        body: 'Your BazCoin balance appears on the Home screen header and in your Profile page.',
      },
    ],
  },
  {
    id: 'support',
    icon: <MessageCircle size={20} color={COLORS.primary} />,
    title: 'Getting Help',
    steps: [
      {
        heading: 'Chat with Baz Bot',
        body: 'Open Help Center → Chat Support to get instant answers from our AI assistant about orders, shipping, returns, and more.',
      },
      {
        heading: 'Talk to an Agent',
        body: 'If the bot can\'t help, tap "Talk to an Agent" and your chat will be escalated. A support agent will respond within 1–2 business days.',
      },
      {
        heading: 'Submit a Ticket',
        body: 'Go to Help Center → My Tickets → Create Ticket. Describe your issue, select a category, and attach screenshots if needed.',
      },
    ],
  },
  {
    id: 'seller',
    icon: <Store size={20} color={COLORS.primary} />,
    title: 'Becoming a Seller',
    steps: [
      {
        heading: 'Apply to Sell',
        body: 'From the Profile screen, tap "Become a Seller." Fill in your store name, description, and business details. Admin will review and approve within 24–48 hours.',
      },
      {
        heading: 'List Products',
        body: 'Once approved, access the Seller Dashboard to add products with photos, descriptions, pricing, inventory counts, and variants.',
      },
      {
        heading: 'Manage Orders',
        body: 'View incoming orders in the Seller tab, confirm or reject them, print shipping labels, and update delivery status as you fulfill.',
      },
    ],
  },
];

export default function UserGuideScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>('getting-started');

  const toggle = (id: string) => {
    setExpanded(prev => (prev === id ? null : id));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <LinearGradient colors={['#D97706', '#B45309']} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>User Guide</Text>
          <Text style={styles.headerSubtitle}>Everything you need to know about BazaarX</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to BazaarX! 👋</Text>
          <Text style={styles.welcomeBody}>
            BazaarX is your local marketplace for discovering unique products, following your
            favorite shops, and earning rewards on every purchase. This guide walks you through
            everything — from setting up your account to tracking deliveries.
          </Text>
        </View>

        {/* Sections */}
        {GUIDE_SECTIONS.map((section) => {
          const isOpen = expanded === section.id;
          return (
            <View key={section.id} style={styles.sectionCard}>
              <Pressable
                onPress={() => toggle(section.id)}
                style={styles.sectionHeader}
              >
                <View style={styles.sectionIcon}>{section.icon}</View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {isOpen
                  ? <ChevronDown size={20} color={COLORS.textMuted} />
                  : <ChevronRight size={20} color={COLORS.textMuted} />
                }
              </Pressable>

              {isOpen && (
                <View style={styles.stepsContainer}>
                  {section.steps.map((step, idx) => (
                    <View key={idx} style={styles.stepRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={styles.stepHeading}>{step.heading}</Text>
                        <Text style={styles.stepBody}>{step.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer tip */}
        <View style={styles.footerTip}>
          <Shield size={18} color={COLORS.primary} />
          <Text style={styles.footerTipText}>
            Need more help? Visit the Help Center or chat with our support bot anytime.
          </Text>
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
  // Welcome
  welcomeCard: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FDE8C8',
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 8,
  },
  welcomeBody: {
    fontSize: 14,
    color: COLORS.gray900,
    lineHeight: 21,
  },
  // Section cards
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0E6D3',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  // Steps
  stepsContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0E6D3',
  },
  stepRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  stepBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  // Footer
  footerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE8C8',
  },
  footerTipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray900,
    lineHeight: 18,
  },
});
