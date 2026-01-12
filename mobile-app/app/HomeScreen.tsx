import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Modal,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, ShoppingBag, Camera, Bot, X, Package, Timer, MapPin, ChevronDown, ArrowLeft, Clock, TrendingUp } from 'lucide-react-native';
import { ProductCard } from '../src/components/ProductCard';
import CameraSearchModal from '../src/components/CameraSearchModal';
import AIChatModal from '../src/components/AIChatModal';
import LocationModal from '../src/components/LocationModal';
import { trendingProducts, bestSellerProducts } from '../src/data/products';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Product } from '../src/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

const categories = [
  { id: '1', name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
  { id: '2', name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300' },
  { id: '3', name: 'Home & Living', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300' },
  { id: '4', name: 'Beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300' },
  { id: '5', name: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300' },
];

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = '#FF5722';
  
  const [activeTab, setActiveTab] = useState<'Home' | 'Category'>('Home');
  const [showAIChat, setShowAIChat] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCameraSearch, setShowCameraSearch] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches] = useState(['wireless earbuds', 'leather bag']);
  const [deliveryAddress, setDeliveryAddress] = useState('123 Main St, Manila');
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  const username = 'Jonathan';

  const notifications = [
    { id: '1', title: 'Order Shipped! 📦', message: 'Your order #A238567K has been shipped!', time: '2h ago', read: false, icon: Package, color: '#3B82F6' },
  ];

  const allProducts = [...trendingProducts, ...bestSellerProducts];
  const filteredProducts = searchQuery.trim() 
    ? allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) 
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. BRANDED HEADER SECTION */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' }} style={styles.avatar} />
            <View style={styles.greetingContainer}>
              <Text style={[styles.greetingTitle, { color: '#FFF' }]}>Hi, {username}</Text>
              <Text style={[styles.greetingSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Let's go shopping</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={() => setIsSearchFocused(true)} style={styles.headerIconButton}><Search size={24} color="#FFF" /></Pressable>
            <Pressable onPress={() => setShowNotifications(true)} style={styles.headerIconButton}>
              <Bell size={24} color="#FFF" />
              {notifications.some(n => !n.read) && <View style={[styles.notifBadge, { backgroundColor: '#FFF' }]} />}
            </Pressable>
          </View>
        </View>

        {isSearchFocused && (
          <View style={styles.searchBarWrapper}>
            <Pressable onPress={() => { setIsSearchFocused(false); setSearchQuery(''); }} style={styles.searchBackBtn}>
              <ArrowLeft size={20} color="#FFF" />
            </Pressable>
            <View style={[styles.searchBarInner, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Search size={18} color="#FFF" />
              <TextInput style={[styles.searchInput, { color: '#FFF' }]} placeholder="Search products..." placeholderTextColor="rgba(255,255,255,0.7)" value={searchQuery} onChangeText={setSearchQuery} autoFocus />
              <Pressable onPress={() => setShowCameraSearch(true)}><Camera size={18} color="#FFF" /></Pressable>
            </View>
          </View>
        )}

        {/* Home/Category Selection: Maintained neutral color (white) */}
        {!isSearchFocused && (
          <View style={styles.tabBarCenter}>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('Home')}>
              <Text style={[styles.tabLabel, activeTab === 'Home' && { color: '#FFF', fontWeight: '800' }]}>Home</Text>
              <View style={[styles.tabIndicator, activeTab === 'Home' && { backgroundColor: '#FFF' }]} />
            </Pressable>
            <Pressable style={styles.tabItem} onPress={() => setActiveTab('Category')}>
              <Text style={[styles.tabLabel, activeTab === 'Category' && { color: '#FFF', fontWeight: '800' }]}>Category</Text>
              <View style={[styles.tabIndicator, activeTab === 'Category' && { backgroundColor: '#FFF' }]} />
            </Pressable>
          </View>
        )}
      </View>

      {/* 2. VISIBLE DELIVERY BAR */}
      {!isSearchFocused && activeTab === 'Home' && (
        <Pressable style={styles.deliveryBarVisible} onPress={() => setShowLocationModal(true)}>
          <View style={styles.deliveryContent}>
            <MapPin size={16} color={BRAND_COLOR} />
            <Text style={styles.deliveryText} numberOfLines={1}>Deliver to: <Text style={styles.deliveryAddressBold}>{deliveryAddress}</Text></Text>
            <ChevronDown size={16} color="#9CA3AF" />
          </View>
        </Pressable>
      )}

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {isSearchFocused ? (
          <View style={styles.searchDiscovery}>
            {searchQuery.trim() === '' ? (
              <View style={styles.recentSection}>
                <Text style={styles.discoveryTitle}>Recent Searches</Text>
                {recentSearches.map((term, i) => (
                  <Pressable key={i} style={styles.searchRecentItem} onPress={() => setSearchQuery(term)}>
                    <Clock size={16} color="#9CA3AF" />
                    <Text style={styles.searchRecentText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.resultsSection}>
                <Text style={styles.discoveryTitle}>{filteredProducts.length} results found</Text>
                <View style={styles.gridBody}>
                  {filteredProducts.map(p => (
                    <View key={p.id} style={styles.gridCardWrapper}>
                      <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : activeTab === 'Home' ? (
          <>
            {/* 3. DISCOUNT ADS / PROMO */}
            <View style={styles.promoWrapper}>
              <View style={[styles.promoBox, { borderLeftWidth: 6, borderLeftColor: BRAND_COLOR }]}>
                <View style={styles.promoTextPart}>
                  <View style={[styles.promoBadge, { backgroundColor: BRAND_COLOR }]}>
                    <Text style={styles.promoBadgeText}>EXCLUSIVE DISCOUNT</Text>
                  </View>
                  <Text style={styles.promoHeadline}>24% off shipping today on bag purchases</Text>
                  <Text style={[styles.promoBrandName, { color: '#666' }]}>Official Kutuku Store</Text>
                </View>
                <View style={styles.promoImgPart}><Image source={{ uri: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400' }} style={styles.promoImg} /></View>
              </View>
            </View>

            {/* 4. FLASH SALE */}
            <View style={styles.flashSaleSection}>
              <View style={styles.flashHeader}>
                <View style={styles.row}>
                    <Text style={[styles.gridTitleText, { color: BRAND_COLOR }]}>FLASH SALE</Text>
                    <View style={[styles.timerBox, { backgroundColor: '#333' }]}>
                        <Timer size={14} color="#FFF" />
                        <Text style={styles.timerText}>02:15:45</Text>
                    </View>
                </View>
                <Pressable onPress={() => navigation.navigate('Shop', {})}><Text style={styles.gridSeeAll}>View All</Text></Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20 }}>
                {bestSellerProducts.map(p => (
                    <View key={p.id} style={styles.flashItemContainer}>
                        <ProductCard product={p} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
                        <View style={[styles.discountTag, { backgroundColor: BRAND_COLOR }]}><Text style={styles.discountTagText}>-50%</Text></View>
                    </View>
                ))}
              </ScrollView>
            </View>

            {/* 5. NEW ARRIVALS */}
            <View style={styles.gridContainer}>
              <View style={styles.gridHeader}>
                <Text style={styles.gridTitleText}>New Arrivals 🔥</Text>
                <Pressable onPress={() => navigation.navigate('Shop', {})}><Text style={[styles.gridSeeAll, { color: BRAND_COLOR }]}>See All</Text></Pressable>
              </View>
              <View style={styles.gridBody}>
                {trendingProducts.slice(0, 4).map((product) => (<View key={product.id} style={styles.gridCardWrapper}><ProductCard product={product} onPress={() => navigation.navigate('ProductDetail', { product })} /></View>))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.categoryExpandedContent}>
            <Text style={styles.categorySectionTitle}>Shop by Category</Text>
            <View style={styles.categoryGrid}>
              {categories.map((item) => (
                <Pressable key={item.id} style={styles.categoryCard}>
                  <Image source={{ uri: item.image }} style={styles.categoryCardImage} />
                  <View style={styles.categoryCardOverlay} />
                  <Text style={styles.categoryCardText}>{item.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- FLOATING AI AGENT (Positioned above nav bar) --- */}
      <Pressable 
        style={[styles.aiFloatingButton, { backgroundColor: BRAND_COLOR, bottom: 90 }]} 
        onPress={() => setShowAIChat(true)}
      >
        <Bot size={28} color="#FFF" />
      </Pressable>

      <AIChatModal visible={showAIChat} onClose={() => setShowAIChat(false)} />
      <CameraSearchModal visible={showCameraSearch} onClose={() => setShowCameraSearch(false)} />
      <LocationModal visible={showLocationModal} onClose={() => setShowLocationModal(false)} onSelectLocation={setDeliveryAddress} currentAddress={deliveryAddress} />
      
      <Modal visible={showNotifications} animationType="slide" transparent={true} onRequestClose={() => setShowNotifications(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.notificationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <Pressable onPress={() => setShowNotifications(false)}><X size={24} color="#1F2937" /></Pressable>
            </View>
            <ScrollView style={{ padding: 20 }}>
              {notifications.map((n) => (
                <View key={n.id} style={styles.notificationItem}>
                  <View style={[styles.notificationIcon, { backgroundColor: `${n.color}15` }]}><n.icon size={24} color={n.color} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.notifItemTitle}>{n.title}</Text><Text style={styles.notifItemMsg}>{n.message}</Text></View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerContainer: { paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: '#FFF' },
  greetingContainer: { justifyContent: 'center' },
  greetingTitle: { fontSize: 16, fontWeight: '700' },
  greetingSubtitle: { fontSize: 13 },
  headerRight: { flexDirection: 'row', gap: 16 },
  headerIconButton: { padding: 4 },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#FF5722' },
  searchBarWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  searchBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  searchBackBtn: { padding: 4 },
  tabBarCenter: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginBottom: 5 },
  tabItem: { paddingVertical: 10, alignItems: 'center' },
  tabLabel: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabIndicator: { marginTop: 4, height: 3, width: 30, borderRadius: 2 },
  deliveryBarVisible: { backgroundColor: '#F9FAFB', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  deliveryContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deliveryText: { fontSize: 13, color: '#4B5563', flex: 1 },
  deliveryAddressBold: { fontWeight: '700', color: '#1F2937' },
  contentScroll: { flex: 1 },
  promoWrapper: { padding: 20, paddingBottom: 10 },
  promoBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  promoTextPart: { flex: 0.65 },
  promoBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  promoBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  promoHeadline: { fontSize: 18, fontWeight: '800', color: '#1F2937', lineHeight: 24, marginBottom: 8 },
  promoBrandName: { fontSize: 12, fontWeight: '700' },
  promoImgPart: { width: 80, height: 100, borderRadius: 12, overflow: 'hidden' },
  promoImg: { width: '100%', height: '100%' },
  flashSaleSection: { marginVertical: 15 },
  flashHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timerBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  timerText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  flashItemContainer: { width: 160, marginRight: 15, position: 'relative' },
  discountTag: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  discountTagText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  gridContainer: { paddingHorizontal: 20, marginBottom: 30 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  gridTitleText: { fontSize: 18, fontWeight: '900', color: '#1F2937', letterSpacing: 0.5 },
  gridSeeAll: { fontSize: 14, fontWeight: '700', color: '#999' },
  gridBody: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCardWrapper: { width: (width - 55) / 2, marginBottom: 20 },
  aiFloatingButton: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  searchDiscovery: { padding: 20 },
  discoveryTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
  recentSection: { marginBottom: 20 },
  searchRecentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  searchRecentText: { fontSize: 15, color: '#4B5563' },
  resultsSection: { flex: 1 },
  categoryExpandedContent: { padding: 20 },
  categorySectionTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 15 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: (width - 55) / 2, height: 100, borderRadius: 16, overflow: 'hidden', marginBottom: 15, justifyContent: 'center', alignItems: 'center' },
  categoryCardImage: { ...StyleSheet.absoluteFillObject },
  categoryCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  categoryCardText: { color: '#FFF', fontWeight: '800', fontSize: 15, zIndex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  notificationModalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  notificationItem: { flexDirection: 'row', padding: 18, marginBottom: 10 },
  notificationIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  notifItemTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  notifItemMsg: { fontSize: 14, color: '#4B5563' }
});