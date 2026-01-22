import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, MessageSquare, Bell, Package, ShoppingBag, Tag, ChevronDown } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen({ navigation }: Props) {
  const { isGuest } = useAuthStore();
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setShowGuestModal(true);
    }
  }, [isGuest]);

  // Early return for Guest Mode - Renders ONLY the header and the modal, no content below.
  if (isGuest) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#111827" />
                </Pressable>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.placeholder} />
            </View>
            <GuestLoginModal
                visible={true}
                onClose={() => {
                    navigation.navigate('MainTabs', { screen: 'Home' });
                }}
                message="Sign up to view your notifications."
                hideCloseButton={true}
                cancelText="Go back to Home"
            />
        </SafeAreaView>
      );
  }

  const [notifications, setNotifications] = useState({
    email: {
      orderUpdates: true,
      promotions: true,
      newsletter: false,
    },
    sms: {
      delivery: true,
      orderConfirmation: true,
    },
    push: {
      orderStatus: true,
      newDeals: true,
      priceDrops: true,
      messages: true,
      flashSales: false,
    },
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleNotification = (category: 'email' | 'sms' | 'push', key: string) => {
    setNotifications(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key as keyof typeof prev[typeof category]],
      },
    }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <GuestLoginModal
        visible={showGuestModal}
        onClose={() => {
          navigation.navigate('MainTabs', { screen: 'Home' });
        }}
        message="Sign up to view your notifications."
        hideCloseButton={true}
        cancelText="Go back to Home"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Email Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Mail size={18} color="#FF6A00" />
            <Text style={styles.sectionTitle}>Email Notifications</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('email-orderUpdates')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Order Updates</Text>
                  {expandedItems.has('email-orderUpdates') && (
                    <Text style={styles.settingSubtitle}>Receive order status updates via email</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('email-orderUpdates') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.email.orderUpdates}
                onValueChange={() => toggleNotification('email', 'orderUpdates')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('email-promotions')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Promotions & Deals</Text>
                  {expandedItems.has('email-promotions') && (
                    <Text style={styles.settingSubtitle}>Get notified about special offers</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('email-promotions') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.email.promotions}
                onValueChange={() => toggleNotification('email', 'promotions')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('email-newsletter')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Newsletter</Text>
                  {expandedItems.has('email-newsletter') && (
                    <Text style={styles.settingSubtitle}>Monthly newsletter with tips and trends</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('email-newsletter') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.email.newsletter}
                onValueChange={() => toggleNotification('email', 'newsletter')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>

        {/* SMS Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={18} color="#FF6A00" />
            <Text style={styles.sectionTitle}>SMS Notifications</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('sms-delivery')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Delivery Updates</Text>
                  {expandedItems.has('sms-delivery') && (
                    <Text style={styles.settingSubtitle}>Get SMS updates about your delivery</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('sms-delivery') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.sms.delivery}
                onValueChange={() => toggleNotification('sms', 'delivery')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('sms-orderConfirmation')}
            >
              <View style={styles.settingLeft}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Order Confirmation</Text>
                  {expandedItems.has('sms-orderConfirmation') && (
                    <Text style={styles.settingSubtitle}>Receive SMS when order is placed</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('sms-orderConfirmation') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.sms.orderConfirmation}
                onValueChange={() => toggleNotification('sms', 'orderConfirmation')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>

        {/* Push Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color="#FF6A00" />
            <Text style={styles.sectionTitle}>Push Notifications</Text>
          </View>
          
          <View style={styles.settingCard}>
            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('push-orderStatus')}
            >
              <View style={styles.settingLeft}>
                <Package size={18} color="#3B82F6" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Order Status</Text>
                  {expandedItems.has('push-orderStatus') && (
                    <Text style={styles.settingSubtitle}>Track your order in real-time</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('push-orderStatus') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.push.orderStatus}
                onValueChange={() => toggleNotification('push', 'orderStatus')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('push-newDeals')}
            >
              <View style={styles.settingLeft}>
                <Tag size={18} color="#10B981" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>New Deals</Text>
                  {expandedItems.has('push-newDeals') && (
                    <Text style={styles.settingSubtitle}>Be first to know about new deals</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('push-newDeals') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.push.newDeals}
                onValueChange={() => toggleNotification('push', 'newDeals')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('push-priceDrops')}
            >
              <View style={styles.settingLeft}>
                <ShoppingBag size={18} color="#F59E0B" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Price Drops</Text>
                  {expandedItems.has('push-priceDrops') && (
                    <Text style={styles.settingSubtitle}>Get alerted on wishlist price drops</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('push-priceDrops') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.push.priceDrops}
                onValueChange={() => toggleNotification('push', 'priceDrops')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('push-messages')}
            >
              <View style={styles.settingLeft}>
                <MessageSquare size={18} color="#8B5CF6" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Messages</Text>
                  {expandedItems.has('push-messages') && (
                    <Text style={styles.settingSubtitle}>Seller messages and chat updates</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('push-messages') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.push.messages}
                onValueChange={() => toggleNotification('push', 'messages')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>

            <View style={styles.divider} />

            <Pressable 
              style={styles.settingItem}
              onPress={() => toggleExpanded('push-flashSales')}
            >
              <View style={styles.settingLeft}>
                <Bell size={18} color="#EF4444" />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Flash Sales</Text>
                  {expandedItems.has('push-flashSales') && (
                    <Text style={styles.settingSubtitle}>Limited-time flash sale alerts</Text>
                  )}
                </View>
                <ChevronDown 
                  size={20} 
                  color="#9CA3AF" 
                  style={{
                    transform: [{ rotate: expandedItems.has('push-flashSales') ? '180deg' : '0deg' }]
                  }}
                />
              </View>
              <Switch
                value={notifications.push.flashSales}
                onValueChange={() => toggleNotification('push', 'flashSales')}
                trackColor={{ false: '#D1D5DB', true: '#FF6A00' }}
                thumbColor="#FFFFFF"
              />
            </Pressable>
          </View>
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
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
});
